import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { AdminCustomerRecord, FulfillmentStatus, Order } from '../types';
import { normalizeOrderDoc } from './orderFirestore';

export type AdminActivityEventType = 'registration' | 'order';

export interface AdminCustomerActivityEvent {
  id: string;
  type: AdminActivityEventType;
  title: string;
  subtitle: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  photoUrl?: string;
  orderId?: string;
  orderNumber?: string;
  orderTotal?: number;
  paymentMethod?: string;
  fulfillmentStatus?: FulfillmentStatus;
  itemCount?: number;
  timestamp: string;
  timestampMs: number;
  source: 'firestore' | 'storefront';
}

function parseFirestoreDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'object' && value !== null) {
    const candidate = value as { toDate?: () => Date; seconds?: number };
    if (typeof candidate.toDate === 'function') {
      const dt = candidate.toDate();
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    if (typeof candidate.seconds === 'number') {
      const dt = new Date(candidate.seconds * 1000);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function buildRegistrationEvent(docId: string, data: Record<string, unknown>): AdminCustomerActivityEvent {
  const uid = typeof data.uid === 'string' && data.uid.trim() ? data.uid.trim() : docId;
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const displayName =
    typeof data.displayName === 'string' && data.displayName.trim()
      ? data.displayName.trim()
      : email
        ? email.split('@')[0]
        : 'New Customer';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const photoUrl = typeof data.photoUrl === 'string' ? data.photoUrl.trim() : '';

  const parsedDate =
    parseFirestoreDate(data.createdAt) ||
    parseFirestoreDate(data.lastLoginAt) ||
    parseFirestoreDate(data.updatedAt) ||
    new Date();

  const detailParts: string[] = [];
  if (email) detailParts.push(email);
  if (phone) detailParts.push(phone);
  if (detailParts.length === 0) detailParts.push('Created customer account');

  return {
    id: `reg:${uid}`,
    type: 'registration',
    title: `${displayName} registered`,
    subtitle: detailParts.join(' · '),
    customerId: uid,
    customerName: displayName,
    customerEmail: email,
    customerPhone: phone || undefined,
    photoUrl: photoUrl || undefined,
    timestamp: parsedDate.toISOString(),
    timestampMs: parsedDate.getTime(),
    source: 'firestore',
  };
}

export function buildOrderActivityEvent(
  order: Order,
  source: 'firestore' | 'storefront',
  firestoreTimestamp?: unknown
): AdminCustomerActivityEvent {
  const parsedDate =
    parseFirestoreDate(firestoreTimestamp) ||
    parseFirestoreDate(order.createdAt) ||
    new Date();

  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
    : 0;

  const customerName = order.customerName?.trim() || 'Customer';
  const methodLabel = (order.paymentMethod || 'cod').toUpperCase();
  const itemLabel = itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Order';

  return {
    id: `ord:${order.id}`,
    type: 'order',
    title: `${customerName} placed Order #${order.orderNumber}`,
    subtitle: `${itemLabel} · ৳${order.total} · ${methodLabel}`,
    customerId: order.firebaseUid || undefined,
    customerName,
    customerEmail: order.customerEmail || '',
    customerPhone: order.customerPhone || undefined,
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderTotal: order.total,
    paymentMethod: methodLabel,
    fulfillmentStatus: order.fulfillmentStatus,
    itemCount,
    timestamp: parsedDate.toISOString(),
    timestampMs: parsedDate.getTime(),
    source,
  };
}

export function buildRegistrationEventFromRecord(
  customer: AdminCustomerRecord
): AdminCustomerActivityEvent {
  const customerId = (customer.uid || customer.id || '').trim();
  const displayName =
    customer.displayName?.trim() ||
    (customer.email ? customer.email.split('@')[0] : 'Registered Customer');
  const parsedDate = parseFirestoreDate(customer.createdAt) || new Date();
  const detailParts: string[] = [];
  if (customer.email) detailParts.push(customer.email);
  if (customer.phone) detailParts.push(customer.phone);
  if (detailParts.length === 0) detailParts.push('Registered customer account');

  return {
    id: `reg:${customerId}`,
    type: 'registration',
    title: `${displayName} registered`,
    subtitle: detailParts.join(' · '),
    customerId: customerId || undefined,
    customerName: displayName,
    customerEmail: customer.email || '',
    customerPhone: customer.phone || undefined,
    photoUrl: customer.photoUrl || undefined,
    timestamp: parsedDate.toISOString(),
    timestampMs: parsedDate.getTime(),
    source: 'storefront',
  };
}

export function mergeActivityFeeds(
  firestoreEvents: AdminCustomerActivityEvent[],
  serverOrders: Order[],
  serverCustomers: AdminCustomerRecord[] = [],
  limit = 40
): AdminCustomerActivityEvent[] {
  const byId = new Map<string, AdminCustomerActivityEvent>();

  for (const ev of firestoreEvents) {
    byId.set(ev.id, ev);
  }

  for (const ord of serverOrders) {
    const key = `ord:${ord.id}`;
    if (!byId.has(key)) {
      byId.set(key, buildOrderActivityEvent(ord, 'storefront'));
    }
  }

  for (const cust of serverCustomers) {
    if (!cust.isRegistered) continue;
    const cid = (cust.uid || cust.id || '').trim();
    if (!cid) continue;
    const key = `reg:${cid}`;
    if (!byId.has(key)) {
      byId.set(key, buildRegistrationEventFromRecord(cust));
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, limit);
}

export interface SubscribeAdminActivityCallbacks {
  onUpdate: (payload: {
    events: AdminCustomerActivityEvent[];
    firestoreOrders: Order[];
    lastSyncedAt: string;
  }) => void;
  onLiveEvent?: (event: AdminCustomerActivityEvent) => void;
  onError?: (error: Error) => void;
}

export function subscribeAdminCustomerActivityFromFirestore({
  onUpdate,
  onLiveEvent,
  onError,
}: SubscribeAdminActivityCallbacks): Unsubscribe {
  if (!auth.currentUser) {
    return () => {};
  }

  let usersEvents: AdminCustomerActivityEvent[] = [];
  let orderEvents: AdminCustomerActivityEvent[] = [];
  let latestFirestoreOrders: Order[] = [];

  let usersInitialized = false;
  let ordersInitialized = false;
  const knownUserIds = new Set<string>();
  const knownOrderIds = new Set<string>();

  const emitCombined = () => {
    const combined = [...usersEvents, ...orderEvents].sort(
      (a, b) => b.timestampMs - a.timestampMs
    );
    onUpdate({
      events: combined,
      firestoreOrders: latestFirestoreOrders,
      lastSyncedAt: new Date().toISOString(),
    });
  };

  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const nextUsers: AdminCustomerActivityEvent[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        nextUsers.push(buildRegistrationEvent(docSnap.id, data));
      }

      if (!usersInitialized) {
        for (const docSnap of snapshot.docs) {
          knownUserIds.add(docSnap.id);
        }
        usersInitialized = true;
      } else {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' && !knownUserIds.has(change.doc.id)) {
            knownUserIds.add(change.doc.id);
            const ev = buildRegistrationEvent(
              change.doc.id,
              change.doc.data() as Record<string, unknown>
            );
            onLiveEvent?.(ev);
          }
        }
      }

      usersEvents = nextUsers;
      emitCombined();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } catch (structuredErr) {
        onError?.(
          structuredErr instanceof Error
            ? structuredErr
            : new Error('Unable to listen to Firestore users activity.')
        );
      }
    }
  );

  const unsubOrders = onSnapshot(
    collection(db, 'orders'),
    (snapshot) => {
      const nextOrders: Order[] = [];
      const nextOrderEvents: AdminCustomerActivityEvent[] = [];

      for (const docSnap of snapshot.docs) {
        const raw = docSnap.data() as Record<string, unknown>;
        const normalized = normalizeOrderDoc(docSnap.id, raw);
        nextOrders.push(normalized);
        nextOrderEvents.push(buildOrderActivityEvent(normalized, 'firestore', raw.createdAt));
      }

      if (!ordersInitialized) {
        for (const docSnap of snapshot.docs) {
          knownOrderIds.add(docSnap.id);
        }
        ordersInitialized = true;
      } else {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' && !knownOrderIds.has(change.doc.id)) {
            knownOrderIds.add(change.doc.id);
            const raw = change.doc.data() as Record<string, unknown>;
            const normalized = normalizeOrderDoc(change.doc.id, raw);
            const ev = buildOrderActivityEvent(normalized, 'firestore', raw.createdAt);
            onLiveEvent?.(ev);
          }
        }
      }

      latestFirestoreOrders = nextOrders;
      orderEvents = nextOrderEvents;
      emitCombined();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      } catch (structuredErr) {
        onError?.(
          structuredErr instanceof Error
            ? structuredErr
            : new Error('Unable to listen to Firestore orders activity.')
        );
      }
    }
  );

  return () => {
    unsubUsers();
    unsubOrders();
  };
}
