import type { PhoneCaseProduct } from '../models/phoneCase';
import type { Category } from '../types';
import { getCategoryAndDescendantNames } from './categoryTree';

export const PROTECTOR_CATEGORY_RE =
  /protector|tempered[\s\-_]*glass|camera[\s\-_]*lens|lens[\s\-_]*glass|hydrogel/i;

export const COMBINED_PROTECTOR_CATEGORY_RE =
  /screen[\s\-_&]+(?:and[\s\-_&]+)?camera[\s\-_&]*protector/i;

export const CAMERA_PROTECTOR_RE =
  /camera[\s\-_]*(lens[\s\-_]*)?(protector|guard|glass|film)|lens[\s\-_]*(protector|guard|glass|film)/i;

export const SCREEN_PROTECTOR_RE =
  /screen[\s\-_]*(protector|guard|glass|film)|tempered[\s\-_]*glass|smart[\s\-_]*devil|privacy[\s\-_]*(glass|screen)|matte[\s\-_]*(glass|screen)|hydrogel|uv[\s\-_]*glass|9h[\s\-_]*(glass|protector)/i;

function buildParentMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function isProtectorCategory(
  category: Category | undefined,
  allCategories: Category[]
): boolean {
  if (!category) return false;
  const byId = buildParentMap(allCategories);
  const visited = new Set<string>();
  let cursor: Category | undefined = category;

  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    if (PROTECTOR_CATEGORY_RE.test(cursor.name.trim())) {
      return true;
    }
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  return false;
}

export function getProtectorCategorySets(categories: Category[]) {
  const allSet = new Set<string>();
  const cameraSet = new Set<string>();
  const screenSet = new Set<string>();
  const generalSet = new Set<string>();

  for (const cat of categories) {
    if (cat.active === false) continue;
    const name = cat.name.trim();
    if (!name) continue;
    if (!isProtectorCategory(cat, categories)) continue;

    const descendants = getCategoryAndDescendantNames(categories, name);
    for (const d of descendants) allSet.add(d);

    const isCombined = COMBINED_PROTECTOR_CATEGORY_RE.test(name);
    if (!isCombined && CAMERA_PROTECTOR_RE.test(name)) {
      for (const d of descendants) cameraSet.add(d);
    } else if (!isCombined && SCREEN_PROTECTOR_RE.test(name)) {
      for (const d of descendants) screenSet.add(d);
    } else {
      for (const d of descendants) generalSet.add(d);
    }
  }

  return { allSet, cameraSet, screenSet, generalSet };
}

function productInSet(product: PhoneCaseProduct, nameSet: Set<string>): boolean {
  if (nameSet.size === 0) return false;
  if (nameSet.has(product.category.trim().toLowerCase())) return true;
  return (product.alsoShowIn || []).some((c) => nameSet.has(c.trim().toLowerCase()));
}

export function isCameraProtectorProduct(
  product: PhoneCaseProduct,
  categories: Category[],
  precomputedSets?: ReturnType<typeof getProtectorCategorySets>
): boolean {
  const sets = precomputedSets || getProtectorCategorySets(categories);
  if (productInSet(product, sets.cameraSet)) return true;
  if (CAMERA_PROTECTOR_RE.test(product.category)) return true;
  if ((product.alsoShowIn || []).some((c) => CAMERA_PROTECTOR_RE.test(c))) return true;
  return CAMERA_PROTECTOR_RE.test(product.title);
}

export function isScreenProtectorProduct(
  product: PhoneCaseProduct,
  categories: Category[],
  precomputedSets?: ReturnType<typeof getProtectorCategorySets>
): boolean {
  const sets = precomputedSets || getProtectorCategorySets(categories);
  if (productInSet(product, sets.screenSet)) return true;
  if (SCREEN_PROTECTOR_RE.test(product.category)) return true;
  if ((product.alsoShowIn || []).some((c) => SCREEN_PROTECTOR_RE.test(c))) return true;
  return SCREEN_PROTECTOR_RE.test(product.title);
}

export function isProtectorProduct(
  product: PhoneCaseProduct,
  categories: Category[],
  precomputedSets?: ReturnType<typeof getProtectorCategorySets>
): boolean {
  const sets = precomputedSets || getProtectorCategorySets(categories);
  if (productInSet(product, sets.allSet)) return true;
  if (PROTECTOR_CATEGORY_RE.test(product.category)) return true;
  if ((product.alsoShowIn || []).some((c) => PROTECTOR_CATEGORY_RE.test(c))) return true;
  if (CAMERA_PROTECTOR_RE.test(product.title) || SCREEN_PROTECTOR_RE.test(product.title)) {
    return true;
  }
  return false;
}
