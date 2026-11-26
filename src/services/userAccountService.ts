import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AdminCustomerRecord,
  CustomerAccountStatus,
  CustomerProfile,
  CustomerSavedAddress,
  Order,
} from '../types';

function normalizeDeliveryArea(val: unknown): 'inside_dhaka' | 'outside_dhaka' {
  return val === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
}

function sanitizeAddressesForClient(raw: unknown): CustomerSavedAddress[] {
  if (!Array.isArray(raw)) return [];
  const result: CustomerSavedAddress[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const addrLine = typeof entry.address === 'string' ? entry.address.trim().slice(0, 300) : '';
    const id =
      typeof entry.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(entry.id.trim())
        ? entry.id.trim()
        : '';
    if (!id || !addrLine || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      label: (typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : 'Home').slice(0, 40),
      recipientName: typeof entry.recipientName === 'string' ? entry.recipientName.trim().slice(0, 80) : '',
      phone: typeof entry.phone === 'string' ? entry.phone.trim().slice(0, 32) : '',
      district: typeof entry.district === 'string' ? entry.district.trim().slice(0, 60) : '',
      address: addrLine,
      deliveryArea: normalizeDeliveryArea(entry.deliveryArea),
      isDefault: Boolean(entry.isDefault),
    });
    if (result.length >= 10) break;
  }
  return result;
}

function buildFallbackProfile(user: User): CustomerProfile {
  const now = new Date().toISOString();
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    phone: '',
    district: '',
    address: '',
    deliveryArea: 'inside_dhaka',
    photoUrl: user.photoURL || '',
    status: 'active',
    addresses: [],
    createdAt: now,
    updatedAt: now,
  };
}

function mergeProfiles(base: CustomerProfile, secondary?: Partial<CustomerProfile> | null): CustomerProfile {
  if (!secondary) return base;
  const addresses =
    Array.isArray(base.addresses) && base.addresses.length > 0
      ? base.addresses
      : Array.isArray(secondary.addresses)
        ? secondary.addresses
        : [];
  const status: CustomerAccountStatus =
    base.status === 'deactivated' || secondary.status === 'deactivated' ? 'deactivated' : 'active';
  return {
    uid: base.uid,
    email: base.email || secondary.email || '',
    displayName: base.displayName || secondary.displayName || '',
    phone: base.phone || secondary.phone || '',
    district: base.district || secondary.district || '',
    address: base.address || secondary.address || '',
    deliveryArea: base.deliveryArea || normalizeDeliveryArea(secondary.deliveryArea),
    photoUrl: base.photoUrl || secondary.photoUrl || '',
    status,
    addresses,
    lastLoginAt: base.lastLoginAt || secondary.lastLoginAt,
    deactivatedAt: status === 'deactivated' ? base.deactivatedAt || secondary.deactivatedAt : undefined,
    adminNote: base.adminNote || secondary.adminNote,
    createdAt: base.createdAt || secondary.createdAt || new Date().toISOString(),
    updatedAt: base.updatedAt || secondary.updatedAt || new Date().toISOString(),
  };
}

async function syncProfileDocToFirestore(user: User, savedProfile: CustomerProfile): Promise<boolean> {
  const docPath = `users/${user.uid}`;
  const docRef = doc(db, 'users', user.uid);
  const sanitizedAddresses = sanitizeAddressesForClient(savedProfile.addresses || []);

  try {
    const existingSnap = await getDoc(docRef);
    const sharedPayload = {
      email: savedProfile.email.slice(0, 254),
      displayName: savedProfile.displayName.slice(0, 80),
      phone: savedProfile.phone.slice(0, 32),
      district: savedProfile.district.slice(0, 60),
      address: savedProfile.address.slice(0, 300),
      deliveryArea: savedProfile.deliveryArea,
      photoUrl: (savedProfile.photoUrl || '').startsWith('https://') ? savedProfile.photoUrl.slice(0, 500) : '',
      addresses: sanitizedAddresses,
      lastLoginAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };

    if (existingSnap.exists()) {
      await updateDoc(docRef, sharedPayload);
    } else {
      await setDoc(docRef, {
        uid: user.uid,
        ...sharedPayload,
        status: 'active',
        deactivatedAt: '',
        createdAt: serverTimestamp(),
      });
    }
    return true;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } catch {
      // Logged structured diagnostic; backend persistence remains authoritative
    }
    return false;
  }
}

export async function loadCustomerProfile(user: User, idToken: string | null): Promise<CustomerProfile> {
  const fallback = buildFallbackProfile(user);
  let firestoreProfile: Partial<CustomerProfile> | null = null;
  let backendProfile: CustomerProfile | null = null;

  // 1. Read Firestore /users/{uid}
  const docPath = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      firestoreProfile = {
        uid: user.uid,
        email: typeof data.email === 'string' ? data.email : user.email || '',
        displayName: typeof data.displayName === 'string' ? data.displayName : user.displayName || '',
        phone: typeof data.phone === 'string' ? data.phone : '',
        district: typeof data.district === 'string' ? data.district : '',
        address: typeof data.address === 'string' ? data.address : '',
        deliveryArea: normalizeDeliveryArea(data.deliveryArea),
        photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : user.photoURL || '',
        status: data.status === 'deactivated' ? 'deactivated' : 'active',
        deactivatedAt: typeof data.deactivatedAt === 'string' && data.deactivatedAt ? data.deactivatedAt : undefined,
        addresses: sanitizeAddressesForClient(data.addresses),
      };
    }
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.GET, docPath);
    } catch {
      // Swallow Firestore permission/network failure after diagnostic logging so backend profile still works
    }
  }

  // 2. Read verified Express backend profile (also registers login & fetches authoritative status)
  if (idToken) {
    try {
      const res = await fetch('/api/account/profile', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        const payload = (await res.json()) as { profile?: CustomerProfile };
        if (payload.profile) {
          backendProfile = payload.profile;
        }
      }
    } catch {
      // Ignore network hiccup if Firestore succeeded
    }
  }

  // Ensure every registered Firebase customer has a /users/{uid} Firestore record
  if (!firestoreProfile && (!backendProfile || backendProfile.status !== 'deactivated')) {
    const initialDoc = backendProfile ? mergeProfiles(backendProfile, fallback) : fallback;
    void syncProfileDocToFirestore(user, initialDoc);
  }

  if (firestoreProfile && backendProfile) {
    return mergeProfiles(
      {
        ...fallback,
        ...firestoreProfile,
        status: backendProfile.status || firestoreProfile.status || 'active',
        deactivatedAt: backendProfile.deactivatedAt || firestoreProfile.deactivatedAt,
        adminNote: backendProfile.adminNote,
        addresses:
          backendProfile.addresses && backendProfile.addresses.length > 0
            ? backendProfile.addresses
            : firestoreProfile.addresses || [],
        createdAt: backendProfile.createdAt,
        updatedAt: backendProfile.updatedAt,
      },
      backendProfile
    );
  }
  if (firestoreProfile) {
    return mergeProfiles({ ...fallback, ...firestoreProfile }, fallback);
  }
  if (backendProfile) {
    return mergeProfiles(backendProfile, fallback);
  }
  return fallback;
}

export async function saveCustomerProfile(
  user: User,
  idToken: string | null,
  draft: {
    displayName: string;
    phone: string;
    district: string;
    address: string;
    deliveryArea: 'inside_dhaka' | 'outside_dhaka';
    addresses?: CustomerSavedAddress[];
  }
): Promise<CustomerProfile> {
  const now = new Date().toISOString();
  let savedProfile: CustomerProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: draft.displayName.trim(),
    phone: draft.phone.trim(),
    district: draft.district.trim(),
    address: draft.address.trim(),
    deliveryArea: normalizeDeliveryArea(draft.deliveryArea),
    photoUrl: user.photoURL || '',
    status: 'active',
    addresses: draft.addresses ? sanitizeAddressesForClient(draft.addresses) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  let backendError: Error | null = null;
  if (idToken) {
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: savedProfile.displayName,
          phone: savedProfile.phone,
          district: savedProfile.district,
          address: savedProfile.address,
          deliveryArea: savedProfile.deliveryArea,
          ...(draft.addresses !== undefined ? { addresses: savedProfile.addresses } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save profile');
      }
      if (data.profile) {
        savedProfile = data.profile as CustomerProfile;
      }
    } catch (err) {
      backendError = err instanceof Error ? err : new Error('Failed to save profile');
    }
  }

  // Respect backend deactivation block immediately
  if (backendError && backendError.message.toLowerCase().includes('deactivated')) {
    throw backendError;
  }

  const firestoreSaved = await syncProfileDocToFirestore(user, savedProfile);

  if (backendError && !firestoreSaved) {
    throw backendError;
  }

  return savedProfile;
}

export async function saveCustomerAddressApi(
  user: User,
  idToken: string,
  addressDraft: Omit<CustomerSavedAddress, 'id'> & { id?: string }
): Promise<CustomerProfile> {
  const res = await fetch('/api/account/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(addressDraft),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.profile) {
    throw new Error(data.error || 'Could not save delivery address');
  }
  const updatedProfile = data.profile as CustomerProfile;
  void syncProfileDocToFirestore(user, updatedProfile);
  return updatedProfile;
}

export async function deleteCustomerAddressApi(
  user: User,
  idToken: string,
  addressId: string
): Promise<CustomerProfile> {
  const res = await fetch(`/api/account/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.profile) {
    throw new Error(data.error || 'Could not delete delivery address');
  }
  const updatedProfile = data.profile as CustomerProfile;
  void syncProfileDocToFirestore(user, updatedProfile);
  return updatedProfile;
}

export async function fetchAccountOrders(idToken: string): Promise<Order[]> {
  const res = await fetch('/api/account/orders', {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load account order history');
  }
  return Array.isArray(data.orders) ? (data.orders as Order[]) : [];
}

// Admin Customer Management API Helpers
export interface AdminCustomerDirectoryStats {
  totalRegistered: number;
  activeCount: number;
  deactivatedCount: number;
  guestCount: number;
  totalCustomers: number;
  totalRevenue: number;
  repeatBuyers: number;
}

export interface AdminCustomerListResponse {
  customers: AdminCustomerRecord[];
  stats: AdminCustomerDirectoryStats;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function fetchAdminCustomers(
  adminToken: string,
  params: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }
): Promise<AdminCustomerListResponse> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`/api/admin/customers?${qs.toString()}`, {
    credentials: 'same-origin',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load customers');
  }
  return data as AdminCustomerListResponse;
}

export async function fetchAdminCustomerDetail(
  adminToken: string,
  customerId: string
): Promise<{ customer: AdminCustomerRecord; orders: Order[] }> {
  const res = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}`, {
    credentials: 'same-origin',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load customer details');
  }
  return data as { customer: AdminCustomerRecord; orders: Order[] };
}

export async function updateAdminCustomerStatus(
  adminToken: string,
  customerId: string,
  status: CustomerAccountStatus,
  adminNote?: string
): Promise<AdminCustomerRecord> {
  const res = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/status`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status,
      ...(adminNote !== undefined ? { adminNote } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update customer account status');
  }

  // Best-effort sync to Firestore /users/{uid} if admin is also signed into Firebase with admin privileges
  try {
    await updateDoc(doc(db, 'users', customerId), {
      status,
      deactivatedAt: status === 'deactivated' ? new Date().toISOString() : '',
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal: server backend status is enforced across APIs
  }

  return data.customer as AdminCustomerRecord;
}

export interface AdminFirestoreCustomerOverviewStats {
  totalRegisteredUsers: number;
  activeAccounts: number;
  deactivatedAccounts: number;
  newRegistrationsLast30Days: number;
  lastSyncedAt: string;
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

function computeFirestoreCustomerOverviewStats(
  docs: Array<Record<string, unknown>>
): AdminFirestoreCustomerOverviewStats {
  const nowMs = Date.now();
  const thirtyDaysAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;

  let totalRegisteredUsers = 0;
  let activeAccounts = 0;
  let deactivatedAccounts = 0;
  let newRegistrationsLast30Days = 0;

  for (const data of docs) {
    totalRegisteredUsers += 1;
    const isDeactivated = data.status === 'deactivated';
    if (isDeactivated) {
      deactivatedAccounts += 1;
    } else {
      activeAccounts += 1;
    }

    const createdDate = parseFirestoreDate(data.createdAt);
    if (createdDate) {
      const ms = createdDate.getTime();
      if (ms >= thirtyDaysAgoMs && ms <= nowMs + 60_000) {
        newRegistrationsLast30Days += 1;
      }
    }
  }

  return {
    totalRegisteredUsers,
    activeAccounts,
    deactivatedAccounts,
    newRegistrationsLast30Days,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function fetchAdminCustomerOverviewFromFirestore(): Promise<AdminFirestoreCustomerOverviewStats> {
  if (!auth.currentUser) {
    throw new Error('Sign in with Google Admin to load live Firestore customer metrics.');
  }
  try {
    const snap = await getDocs(collection(db, 'users'));
    const docs = snap.docs.map((d) => d.data() as Record<string, unknown>);
    return computeFirestoreCustomerOverviewStats(docs);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, 'users');
    } catch (structuredErr) {
      throw structuredErr instanceof Error
        ? structuredErr
        : new Error('Unable to read Firestore users collection.');
    }
  }
}

export function subscribeAdminCustomerOverviewFromFirestore(
  onStats: (stats: AdminFirestoreCustomerOverviewStats) => void,
  onError: (err: Error) => void
): () => void {
  if (!auth.currentUser) {
    return () => {};
  }
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data() as Record<string, unknown>);
      onStats(computeFirestoreCustomerOverviewStats(docs));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } catch (structuredErr) {
        onError(
          structuredErr instanceof Error
            ? structuredErr
            : new Error('Unable to listen to Firestore users collection.')
        );
      }
    }
  );
}

