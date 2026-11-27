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

export const VIRTUAL_PROTECTORS_CATEGORY = 'Screen & Camera Protectors';
export const VIRTUAL_SCREEN_PROTECTOR_CATEGORY = 'Screen Protector';
export const VIRTUAL_CAMERA_PROTECTOR_CATEGORY = 'Camera Protector';

export interface ProtectorSubcategoryCard {
  key: string;
  kind: 'screen' | 'camera' | 'custom';
  label: string;
  categoryName: string;
  image?: string;
}

export function isProtectorViewCategory(
  selectedCategory: string,
  categories: Category[]
): boolean {
  const trimmed = selectedCategory.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return false;
  if (
    COMBINED_PROTECTOR_CATEGORY_RE.test(trimmed) ||
    PROTECTOR_CATEGORY_RE.test(trimmed) ||
    trimmed.toLowerCase() === 'protectors'
  ) {
    return true;
  }
  const matched = categories.find(
    (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  return isProtectorCategory(matched, categories);
}

export function matchesCategorySelection(
  product: PhoneCaseProduct,
  selectedCategory: string,
  categories: Category[],
  precomputedSets?: ReturnType<typeof getProtectorCategorySets>
): boolean {
  const trimmed = selectedCategory.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return true;

  const categoryNames = getCategoryAndDescendantNames(categories, trimmed);
  const directMatch =
    categoryNames.has(product.category.trim().toLowerCase()) ||
    (product.alsoShowIn || []).some((c) => categoryNames.has(c.trim().toLowerCase()));

  if (directMatch) return true;

  const sets = precomputedSets || getProtectorCategorySets(categories);
  const lower = trimmed.toLowerCase();

  if (COMBINED_PROTECTOR_CATEGORY_RE.test(trimmed) || lower === 'protectors') {
    return isProtectorProduct(product, categories, sets);
  }
  if (lower === 'screen protector' || lower === 'screen protectors') {
    return isScreenProtectorProduct(product, categories, sets);
  }
  if (lower === 'camera protector' || lower === 'camera protectors') {
    return isCameraProtectorProduct(product, categories, sets);
  }

  return false;
}

export function buildProtectorSubcategoryCards(
  categories: Category[],
  products: PhoneCaseProduct[]
): {
  cards: ProtectorSubcategoryCard[];
  parentCategoryName: string;
  screenCategoryName: string;
  cameraCategoryName: string;
} {
  const sets = getProtectorCategorySets(categories);
  const screenProducts: PhoneCaseProduct[] = [];
  const cameraProducts: PhoneCaseProduct[] = [];

  for (const p of products) {
    if (!isProtectorProduct(p, categories, sets)) continue;
    if (isScreenProtectorProduct(p, categories, sets)) screenProducts.push(p);
    if (isCameraProtectorProduct(p, categories, sets)) cameraProducts.push(p);
  }

  const activeCats = categories.filter((c) => c.active !== false && c.name.trim());
  const combinedParent = activeCats.find((c) =>
    COMBINED_PROTECTOR_CATEGORY_RE.test(c.name.trim())
  );

  const findBestMatch = (re: RegExp): Category | undefined => {
    const childMatch = combinedParent
      ? activeCats.find(
          (c) =>
            c.parentId === combinedParent.id &&
            !COMBINED_PROTECTOR_CATEGORY_RE.test(c.name) &&
            re.test(c.name)
        )
      : undefined;
    if (childMatch) return childMatch;
    return activeCats.find(
      (c) => !COMBINED_PROTECTOR_CATEGORY_RE.test(c.name) && re.test(c.name)
    );
  };

  const screenCat = findBestMatch(SCREEN_PROTECTOR_RE);
  const cameraCat = findBestMatch(CAMERA_PROTECTOR_RE);

  const screenCategoryName =
    screenCat?.name?.trim() || VIRTUAL_SCREEN_PROTECTOR_CATEGORY;
  const cameraCategoryName =
    cameraCat?.name?.trim() || VIRTUAL_CAMERA_PROTECTOR_CATEGORY;

  const cards: ProtectorSubcategoryCard[] = [
    {
      key: 'camera',
      kind: 'camera',
      label: cameraCategoryName,
      categoryName: cameraCategoryName,
      image: cameraCat?.image?.trim() || cameraProducts[0]?.image || undefined,
    },
    {
      key: 'screen',
      kind: 'screen',
      label: screenCategoryName,
      categoryName: screenCategoryName,
      image: screenCat?.image?.trim() || screenProducts[0]?.image || undefined,
    },
  ];

  if (combinedParent) {
    const knownIds = new Set([screenCat?.id, cameraCat?.id].filter(Boolean));
    for (const child of activeCats) {
      if (child.parentId === combinedParent.id && !knownIds.has(child.id)) {
        const childNames = getCategoryAndDescendantNames(categories, child.name);
        const childProd = products.find(
          (p) =>
            childNames.has(p.category.trim().toLowerCase()) ||
            (p.alsoShowIn || []).some((c) => childNames.has(c.trim().toLowerCase()))
        );
        cards.push({
          key: `cat-${child.id}`,
          kind: 'custom',
          label: child.name.trim(),
          categoryName: child.name.trim(),
          image: child.image?.trim() || childProd?.image || undefined,
        });
      }
    }
  }

  const parentCategoryName =
    combinedParent?.name?.trim() || VIRTUAL_PROTECTORS_CATEGORY;

  return {
    cards,
    parentCategoryName,
    screenCategoryName,
    cameraCategoryName,
  };
}

