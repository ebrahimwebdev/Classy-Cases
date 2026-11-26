import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  FulfillmentStatus,
  Order,
  OrderCourierInfo,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import { isSafeCategoryImageUrl } from './categoryFirestore';

const ORDERS_COLLECTION = 'orders';
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function sanitizeOrderId(rawId: string): string {
  const cleaned = rawId
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned && ID_PATTERN.test(cleaned) ? cleaned : `ord-${Date.now()}`;
}

function normalizePaymentMethod(val: unknown): PaymentMethod {
  if (val === 'cod' || val === 'bkash' || val === 'nagad' || val === 'card') {
    return val;
  }
  return 'cod';
}

function normalizePaymentStatus(val: unknown): PaymentStatus {
  if (val === 'paid' || val === 'pending' || val === 'failed') {
    return val;
  }
  return 'pending';
}

function normalizeFulfillmentStatus(val: unknown): FulfillmentStatus {
  if (
    val === 'pending' ||
    val === 'confirmed' ||
    val === 'shipped' ||
    val === 'delivered' ||
    val === 'cancelled'
  ) {
    return val;
  }
  return 'pending';
}

function normalizeDeliveryArea(val: unknown): Order['deliveryArea'] {
  return val === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
}

function sanitizeOrderItem(item: OrderItem) {
  const rawImage = (item.image || '').trim();
  const safeImage = isSafeCategoryImageUrl(rawImage) ? rawImage.slice(0, 300000) : '';
  return {
    productId: (item.productId || 'case').trim().slice(0, 64) || 'case',
    title: (item.title || 'Phone Case').trim().slice(0, 200) || 'Phone Case',
    model: (item.model || 'Standard Fit').trim().slice(0, 120),
    image: safeImage,
    price: Math.min(1000000, Math.max(0, Number(item.price) || 0)),
    quantity: Math.min(100, Math.max(1, Math.round(Number(item.quantity) || 1))),
  };
}

function buildValidatedOrderPayload(order: Order, userId: string, existingCreatedAt?: Timestamp | null) {
  const safeId = sanitizeOrderId(order.id);
  const safeItems = (order.items || []).slice(0, 50).map(sanitizeOrderItem);
  const createdAtIso = (order.createdAt || new Date().toISOString()).slice(0, 64);
  const updatedAtIso = (order.updatedAt || createdAtIso).slice(0, 64);

  return {
    id: safeId,
    userId: userId.trim().slice(0, 128),
    orderNumber: (order.orderNumber || safeId).trim().slice(0, 32) || safeId.slice(0, 32),
    customerName: (order.customerName || 'Customer').trim().slice(0, 120) || 'Customer',
    customerPhone: (order.customerPhone || 'N/A').trim().slice(0, 32) || 'N/A',
    customerEmail: (order.customerEmail || '').trim().slice(0, 254),
    deliveryAddress: (order.deliveryAddress || 'Bangladesh').trim().slice(0, 300) || 'Bangladesh',
    deliveryArea: normalizeDeliveryArea(order.deliveryArea),
    items: safeItems,
    subtotal: Math.min(10000000, Math.max(0, Number(order.subtotal) || 0)),
    shippingFee: Math.min(100000, Math.max(0, Number(order.shippingFee) || 0)),
    discountAmount: Math.min(10000000, Math.max(0, Number(order.discountAmount) || 0)),
    couponCode: (order.couponCode || '').trim().slice(0, 40),
    total: Math.min(10000000, Math.max(0, Number(order.total) || 0)),
    paymentMethod: normalizePaymentMethod(order.paymentMethod),
    paymentStatus: normalizePaymentStatus(order.paymentStatus),
    fulfillmentStatus: normalizeFulfillmentStatus(order.fulfillmentStatus),
    transactionId: (order.transactionId || safeId).trim().slice(0, 80) || safeId.slice(0, 80),
    source: order.source === 'POS' ? ('POS' as const) : ('Web' as const),
    channel: (order.channel || 'Classy Cases Web').trim().slice(0, 80),
    courierProvider: (order.courier?.provider || '').trim().slice(0, 40),
    courierTrackingCode: (order.courier?.trackingCode || '').trim().slice(0, 80),
    courierConsignmentId: (order.courier?.consignmentId || '').trim().slice(0, 80),
    courierStatus: (order.courier?.status || '').trim().slice(0, 32),
    confirmedAt: (order.confirmedAt || '').trim().slice(0, 64),
    shippedAt: (order.shippedAt || '').trim().slice(0, 64),
    deliveredAt: (order.deliveredAt || '').trim().slice(0, 64),
    createdAtIso,
    updatedAtIso,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildAdminOrderUpdatePayload(order: Order) {
  return {
    customerName: (order.customerName || 'Customer').trim().slice(0, 120) || 'Customer',
    customerPhone: (order.customerPhone || 'N/A').trim().slice(0, 32) || 'N/A',
    deliveryAddress: (order.deliveryAddress || 'Bangladesh').trim().slice(0, 300) || 'Bangladesh',
    deliveryArea: normalizeDeliveryArea(order.deliveryArea),
    paymentStatus: normalizePaymentStatus(order.paymentStatus),
    fulfillmentStatus: normalizeFulfillmentStatus(order.fulfillmentStatus),
    courierProvider: (order.courier?.provider || '').trim().slice(0, 40),
    courierTrackingCode: (order.courier?.trackingCode || '').trim().slice(0, 80),
    courierConsignmentId: (order.courier?.consignmentId || '').trim().slice(0, 80),
    courierStatus: (order.courier?.status || '').trim().slice(0, 32),
    confirmedAt: (order.confirmedAt || '').trim().slice(0, 64),
    shippedAt: (order.shippedAt || '').trim().slice(0, 64),
    deliveredAt: (order.deliveredAt || '').trim().slice(0, 64),
    updatedAtIso: (order.updatedAt || new Date().toISOString()).slice(0, 64),
    updatedAt: serverTimestamp(),
  };
}

function timestampToIso(ts: unknown, fallbackIso?: unknown): string {
  if (typeof fallbackIso === 'string' && fallbackIso.trim()) {
    return fallbackIso.trim();
  }
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as Timestamp).toDate === 'function') {
    try {
      return (ts as Timestamp).toDate().toISOString();
    } catch {
      // fallback below
    }
  }
  return new Date().toISOString();
}

function normalizeCourierProvider(val: unknown): OrderCourierInfo['provider'] {
  if (val === 'Steadfast' || val === 'Pathao' || val === 'RedX' || val === 'Manual') {
    return val;
  }
  return 'Manual';
}

function normalizeCourierStatus(val: unknown): OrderCourierInfo['status'] {
  if (val === 'booked' || val === 'in_transit' || val === 'delivered' || val === 'cancelled') {
    return val;
  }
  return 'booked';
}

export function normalizeOrderDoc(docId: string, data: Record<string, unknown>): Order {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: OrderItem[] = rawItems.map((entry) => {
    const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    return {
      productId: typeof item.productId === 'string' ? item.productId : '',
      title: typeof item.title === 'string' ? item.title : 'Phone Case',
      model: typeof item.model === 'string' ? item.model : 'Standard Fit',
      image: typeof item.image === 'string' ? item.image : '',
      price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
      quantity:
        typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1,
    };
  });

  const courierTrackingCode =
    typeof data.courierTrackingCode === 'string' ? data.courierTrackingCode.trim() : '';
  const courierProvider =
    typeof data.courierProvider === 'string' ? data.courierProvider.trim() : '';
  const courierConsignmentId =
    typeof data.courierConsignmentId === 'string' ? data.courierConsignmentId.trim() : '';
  const courierStatus =
    typeof data.courierStatus === 'string' ? data.courierStatus.trim() : '';

  const total = typeof data.total === 'number' && Number.isFinite(data.total) ? data.total : 0;
  const paymentStatus = normalizePaymentStatus(data.paymentStatus);

  const courier: OrderCourierInfo | undefined =
    courierTrackingCode || courierProvider
      ? {
          provider: normalizeCourierProvider(courierProvider),
          consignmentId: courierConsignmentId || courierTrackingCode,
          trackingCode: courierTrackingCode,
          status: normalizeCourierStatus(courierStatus),
          bookedAt: timestampToIso(
            data.updatedAt,
            typeof data.confirmedAt === 'string' && data.confirmedAt
              ? data.confirmedAt
              : data.updatedAtIso
          ),
          parcelWeightKg: 0.25,
          codAmount: paymentStatus === 'paid' ? 0 : total,
        }
      : undefined;

  return {
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    orderNumber:
      typeof data.orderNumber === 'string' && data.orderNumber ? data.orderNumber : docId,
    customerName: typeof data.customerName === 'string' ? data.customerName : 'Customer',
    customerPhone: typeof data.customerPhone === 'string' ? data.customerPhone : '',
    customerEmail: typeof data.customerEmail === 'string' ? data.customerEmail : '',
    deliveryAddress: typeof data.deliveryAddress === 'string' ? data.deliveryAddress : '',
    deliveryArea: normalizeDeliveryArea(data.deliveryArea),
    items,
    subtotal: typeof data.subtotal === 'number' && Number.isFinite(data.subtotal) ? data.subtotal : 0,
    shippingFee:
      typeof data.shippingFee === 'number' && Number.isFinite(data.shippingFee) ? data.shippingFee : 0,
    discountAmount:
      typeof data.discountAmount === 'number' && Number.isFinite(data.discountAmount)
        ? data.discountAmount
        : 0,
    couponCode:
      typeof data.couponCode === 'string' && data.couponCode.trim()
        ? data.couponCode.trim()
        : undefined,
    total,
    paymentMethod: normalizePaymentMethod(data.paymentMethod),
    paymentStatus,
    fulfillmentStatus: normalizeFulfillmentStatus(data.fulfillmentStatus),
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : '',
    source: data.source === 'POS' ? 'POS' : 'Web',
    channel: typeof data.channel === 'string' ? data.channel : 'Classy Cases Web',
    confirmedAt:
      typeof data.confirmedAt === 'string' && data.confirmedAt.trim()
        ? data.confirmedAt.trim()
        : undefined,
    shippedAt:
      typeof data.shippedAt === 'string' && data.shippedAt.trim()
        ? data.shippedAt.trim()
        : undefined,
    deliveredAt:
      typeof data.deliveredAt === 'string' && data.deliveredAt.trim()
        ? data.deliveredAt.trim()
        : undefined,
    courier,
    firebaseUid: typeof data.userId === 'string' ? data.userId : undefined,
    createdAt: timestampToIso(data.createdAt, data.createdAtIso),
    updatedAt: timestampToIso(data.updatedAt, data.updatedAtIso),
  };
}

export async function saveCustomerOrderToFirestore(order: Order): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !order.items || order.items.length === 0) return;

  const safeId = sanitizeOrderId(order.id);
  const path = `${ORDERS_COLLECTION}/${safeId}`;

  try {
    const ref = doc(db, ORDERS_COLLECTION, safeId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      return;
    }
    const payload = buildValidatedOrderPayload(order, currentUser.uid);
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncOrderToFirestoreAsAdmin(order: Order): Promise<void> {
  const currentUser = auth.currentUser;
  const ownerUid = order.firebaseUid?.trim();
  if (!currentUser || !ownerUid || !order.items || order.items.length === 0) return;

  const safeId = sanitizeOrderId(order.id);
  const path = `${ORDERS_COLLECTION}/${safeId}`;

  try {
    const ref = doc(db, ORDERS_COLLECTION, safeId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, buildAdminOrderUpdatePayload(order));
    } else {
      await setDoc(ref, buildValidatedOrderPayload(order, ownerUid));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncCustomerOrdersBatchToFirestoreAsAdmin(orders: Order[]): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const eligible = orders.filter(
    (ord) => Boolean(ord.firebaseUid?.trim()) && Array.isArray(ord.items) && ord.items.length > 0
  );
  if (eligible.length === 0) return;

  try {
    const existingSnaps = await Promise.all(
      eligible.map((ord) => getDoc(doc(db, ORDERS_COLLECTION, sanitizeOrderId(ord.id))))
    );

    const chunkSize = 400;
    for (let start = 0; start < eligible.length; start += chunkSize) {
      const batch = writeBatch(db);
      const end = Math.min(eligible.length, start + chunkSize);
      for (let i = start; i < end; i += 1) {
        const ord = eligible[i];
        const safeId = sanitizeOrderId(ord.id);
        const ref = doc(db, ORDERS_COLLECTION, safeId);
        const snap = existingSnaps[i];
        if (snap?.exists()) {
          batch.update(ref, buildAdminOrderUpdatePayload(ord));
        } else {
          batch.set(ref, buildValidatedOrderPayload(ord, ord.firebaseUid!.trim()));
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ORDERS_COLLECTION);
  }
}

export function subscribeCustomerOrdersFromFirestore(
  uid: string,
  onOrders: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return () => {};
  }

  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('userId', '==', uid)
  );

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((docSnap) => normalizeOrderDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onOrders(mapped);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
      } catch (handled) {
        onError?.(handled instanceof Error ? handled : new Error('Failed to listen to orders.'));
      }
    }
  );
}
