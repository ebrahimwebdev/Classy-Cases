import type { Category } from '../types';

export function getTopLevelCategories(categories: Category[]): Category[] {
  const idSet = new Set(categories.map((c) => c.id));
  return categories.filter((c) => !c.parentId || !idSet.has(c.parentId) || c.parentId === c.id);
}

export function getSubcategories(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId && c.id !== parentId);
}

export function getCategoryByName(
  categories: Category[],
  name: string
): Category | undefined {
  const target = name.trim().toLowerCase();
  if (!target || target === 'all') return undefined;
  return categories.find((c) => c.name.trim().toLowerCase() === target);
}

export function getRootCategoryFor(
  categories: Category[],
  categoryName: string
): Category | undefined {
  let current = getCategoryByName(categories, categoryName);
  if (!current) return undefined;

  const byId = new Map(categories.map((c) => [c.id, c]));
  const visited = new Set<string>([current.id]);

  while (current.parentId && byId.has(current.parentId) && !visited.has(current.parentId)) {
    visited.add(current.parentId);
    current = byId.get(current.parentId)!;
  }

  return current;
}

export function getCategoryAndDescendantNames(
  categories: Category[],
  categoryName: string
): Set<string> {
  const names = new Set<string>();
  const trimmed = categoryName.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return names;

  names.add(trimmed.toLowerCase());
  const root = getCategoryByName(categories, trimmed);
  if (!root) return names;

  const queue: string[] = [root.id];
  const visited = new Set<string>([root.id]);

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const cat of categories) {
      if (cat.parentId === parentId && !visited.has(cat.id)) {
        visited.add(cat.id);
        names.add(cat.name.trim().toLowerCase());
        queue.push(cat.id);
      }
    }
  }

  return names;
}

export interface HierarchicalCategoryItem {
  category: Category;
  depth: number;
  parentName?: string;
}

export function buildHierarchicalCategories(
  categories: Category[]
): HierarchicalCategoryItem[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenMap = new Map<string, Category[]>();
  const roots: Category[] = [];

  for (const cat of categories) {
    if (!cat.parentId || cat.parentId === cat.id || !byId.has(cat.parentId)) {
      roots.push(cat);
    } else {
      const list = childrenMap.get(cat.parentId) || [];
      list.push(cat);
      childrenMap.set(cat.parentId, list);
    }
  }

  const result: HierarchicalCategoryItem[] = [];
  const visited = new Set<string>();

  function visit(cat: Category, depth: number, parentName?: string) {
    if (visited.has(cat.id)) return;
    visited.add(cat.id);
    result.push({ category: cat, depth, parentName });
    const children = childrenMap.get(cat.id) || [];
    for (const child of children) {
      visit(child, depth + 1, cat.name);
    }
  }

  for (const root of roots) {
    visit(root, 0);
  }

  // Fallback for any cycle
  for (const cat of categories) {
    if (!visited.has(cat.id)) {
      visit(cat, 0);
    }
  }

  return result;
}
