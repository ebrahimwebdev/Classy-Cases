import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Category } from '../types';
import { buildHierarchicalCategories } from '../utils/categoryTree';

const CATEGORIES_COLLECTION = 'categories';
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const DATA_IMAGE_PATTERN =
  /^data:image\/(png|jpeg|jpg|webp|gif|avif|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/;

export function sanitizeCategoryId(rawId: string): string {
  const cleaned = rawId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned && ID_PATTERN.test(cleaned) ? cleaned : `cat-${Date.now()}`;
}

export function sanitizeCategorySlug(rawSlug: string, fallbackName: string): string {
  const source = rawSlug.trim() || fallbackName.trim();
  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned || `category-${Date.now()}`;
}

export function isSafeCategoryImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.length > 300000) return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/src/assets/images/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/media/') ||
    DATA_IMAGE_PATTERN.test(trimmed)
  );
}

function normalizeBrandKey(val: unknown): Category['brandKey'] {
  if (val === 'motorola' || val === 'vivo' || val === 'xiaomi' || val === 'custom') {
    return val;
  }
  return 'custom';
}

function normalizeCategoryDoc(id: string, data: Record<string, unknown>): Category & { sortOrder: number } {
  const name =
    typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Category';
  const slug =
    typeof data.slug === 'string' && data.slug.trim()
      ? data.slug.trim()
      : sanitizeCategorySlug('', name);
  return {
    id,
    name,
    slug,
    brandKey: normalizeBrandKey(data.brandKey),
    featured: data.featured !== false,
    active: data.active !== false,
    parentId: typeof data.parentId === 'string' ? data.parentId.trim() : '',
    description: typeof data.description === 'string' ? data.description : '',
    googleCategory: typeof data.googleCategory === 'string' ? data.googleCategory : '',
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : '',
    seoDescription: typeof data.seoDescription === 'string' ? data.seoDescription : '',
    image: typeof data.image === 'string' ? data.image : '',
    shippingClass: typeof data.shippingClass === 'string' ? data.shippingClass : 'No class',
    isDefault: Boolean(data.isDefault),
    sortOrder:
      typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder)
        ? data.sortOrder
        : 0,
  };
}

function buildValidatedCategoryPayload(
  category: Category,
  uid: string,
  sortOrder: number,
  existingCreatedAt?: Timestamp | null
) {
  const safeId = sanitizeCategoryId(category.id);
  const safeName = (category.name.trim() || 'Category').slice(0, 100);
  const safeSlug = sanitizeCategorySlug(category.slug || '', safeName);
  const rawParentId = (category.parentId || '').trim();
  const safeParentId =
    rawParentId && sanitizeCategoryId(rawParentId) !== safeId
      ? sanitizeCategoryId(rawParentId)
      : '';
  const rawImage = (category.image || '').trim();
  const safeImage = isSafeCategoryImageUrl(rawImage) ? rawImage.slice(0, 300000) : '';

  return {
    id: safeId,
    name: safeName,
    slug: safeSlug,
    brandKey: normalizeBrandKey(category.brandKey),
    featured: category.featured !== false,
    active: category.active !== false,
    parentId: safeParentId,
    description: (category.description || '').trim().slice(0, 1000),
    googleCategory: (category.googleCategory || '').trim().slice(0, 200),
    seoTitle: (category.seoTitle || '').trim().slice(0, 160),
    seoDescription: (category.seoDescription || '').trim().slice(0, 320),
    image: safeImage,
    shippingClass: (category.shippingClass || 'No class').trim().slice(0, 80),
    sortOrder: Math.min(1000, Math.max(0, Math.round(Number(sortOrder) || 0))),
    isDefault: Boolean(category.isDefault),
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
  };
}

export async function fetchPublicCategoriesFromFirestore(): Promise<Category[]> {
  try {
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((docSnap) =>
        normalizeCategoryDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...cat }) => cat);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CATEGORIES_COLLECTION);
  }
}

export async function fetchAdminCategoriesFromFirestore(): Promise<Category[]> {
  try {
    const snapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
    return snapshot.docs
      .map((docSnap) =>
        normalizeCategoryDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...cat }) => cat);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CATEGORIES_COLLECTION);
  }
}

export async function saveCategoryToFirestore(
  category: Category,
  sortOrder = 0,
  allCategories: Category[] = []
): Promise<Category> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please connect your Google admin account before saving categories to Firestore.');
  }

  const safeId = sanitizeCategoryId(category.id);
  const path = `${CATEGORIES_COLLECTION}/${safeId}`;

  try {
    // Collect missing ancestor chain if creating/updating a sub-category whose parent isn't in Firestore yet
    const byId = new Map(allCategories.map((c) => [c.id, c]));
    const chain: Category[] = [category];
    const visited = new Set<string>([category.id]);
    let cursorParentId = category.parentId;

    while (cursorParentId && byId.has(cursorParentId) && !visited.has(cursorParentId)) {
      visited.add(cursorParentId);
      const parentCat = byId.get(cursorParentId)!;
      chain.unshift(parentCat);
      cursorParentId = parentCat.parentId;
    }

    if (chain.length === 1) {
      const ref = doc(db, CATEGORIES_COLLECTION, safeId);
      const existingSnap = await getDoc(ref);
      const existingCreatedAt = existingSnap.exists()
        ? ((existingSnap.data() as { createdAt?: Timestamp }).createdAt ?? null)
        : null;
      const payload = buildValidatedCategoryPayload(
        { ...category, id: safeId },
        currentUser.uid,
        sortOrder,
        existingCreatedAt
      );
      await setDoc(ref, payload);
      return { ...category, id: safeId };
    }

    const batch = writeBatch(db);
    for (let i = 0; i < chain.length; i += 1) {
      const item = chain[i];
      const itemId = sanitizeCategoryId(item.id);
      const itemRef = doc(db, CATEGORIES_COLLECTION, itemId);
      const snap = await getDoc(itemRef);
      const isTarget = item.id === category.id;
      if (!isTarget && snap.exists()) {
        // Parent brand already exists in Firestore; no rewrite needed
        continue;
      }
      const existingCreatedAt = snap.exists()
        ? ((snap.data() as { createdAt?: Timestamp }).createdAt ?? null)
        : null;
      const orderIndex = isTarget
        ? sortOrder
        : Math.max(0, allCategories.findIndex((c) => c.id === item.id));
      const payload = buildValidatedCategoryPayload(
        { ...item, id: itemId },
        currentUser.uid,
        orderIndex,
        existingCreatedAt
      );
      batch.set(itemRef, payload);
    }
    await batch.commit();
    return { ...category, id: safeId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategoryFromFirestore(
  categoryId: string,
  updatedChildren: Category[] = []
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please connect your Google admin account before deleting categories from Firestore.');
  }

  const safeId = sanitizeCategoryId(categoryId);
  const path = `${CATEGORIES_COLLECTION}/${safeId}`;

  try {
    if (updatedChildren.length === 0) {
      await deleteDoc(doc(db, CATEGORIES_COLLECTION, safeId));
      return;
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, CATEGORIES_COLLECTION, safeId));

    for (let i = 0; i < updatedChildren.length; i += 1) {
      const child = updatedChildren[i];
      const childId = sanitizeCategoryId(child.id);
      const childRef = doc(db, CATEGORIES_COLLECTION, childId);
      const childSnap = await getDoc(childRef);
      const existingCreatedAt = childSnap.exists()
        ? ((childSnap.data() as { createdAt?: Timestamp }).createdAt ?? null)
        : null;
      batch.set(
        childRef,
        buildValidatedCategoryPayload(
          { ...child, id: childId },
          currentUser.uid,
          i,
          existingCreatedAt
        )
      );
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncCategoriesToFirestore(categories: Category[]): Promise<Category[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please connect your Google admin account to sync categories with Firestore.');
  }
  if (categories.length === 0) return [];

  const ordered = buildHierarchicalCategories(categories).map((entry) => entry.category);

  try {
    const existingSnaps = await Promise.all(
      ordered.map((cat) => getDoc(doc(db, CATEGORIES_COLLECTION, sanitizeCategoryId(cat.id))))
    );

    const chunkSize = 400;
    for (let start = 0; start < ordered.length; start += chunkSize) {
      const batch = writeBatch(db);
      const end = Math.min(ordered.length, start + chunkSize);
      for (let i = start; i < end; i += 1) {
        const cat = ordered[i];
        const safeId = sanitizeCategoryId(cat.id);
        const snap = existingSnaps[i];
        const existingCreatedAt = snap?.exists()
          ? ((snap.data() as { createdAt?: Timestamp }).createdAt ?? null)
          : null;
        batch.set(
          doc(db, CATEGORIES_COLLECTION, safeId),
          buildValidatedCategoryPayload(
            { ...cat, id: safeId },
            currentUser.uid,
            i,
            existingCreatedAt
          )
        );
      }
      await batch.commit();
    }

    return ordered;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, CATEGORIES_COLLECTION);
  }
}
