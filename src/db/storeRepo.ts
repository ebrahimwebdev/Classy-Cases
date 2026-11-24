import { asc, desc, eq } from 'drizzle-orm';
import type {
  Category,
  Coupon,
  Expense,
  Order,
  Product,
  ProductReview,
  StoreSettings,
  Subscriber,
} from '../types.ts';
import { db } from './index.ts';
import {
  categories,
  coupons,
  expenses,
  orders,
  products,
  reviews,
  storeConfig,
  subscribers,
  type AdminAuthRecord,
} from './schema.ts';

export interface StoreSnapshot {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  subscribers: Subscriber[];
  coupons: Coupon[];
  expenses: Expense[];
  reviews: ProductReview[];
  adminAuth: AdminAuthRecord | null;
  adminOwnerUid?: string | null;
  sessionSecret?: string;
  catalogModified?: boolean;
}

export async function loadOrSeedStoreFromSql(
  getInitialSnapshot: () => StoreSnapshot
): Promise<StoreSnapshot> {
  try {
    const configRows = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.id, 1))
      .limit(1);

    if (configRows.length === 0) {
      const seed = getInitialSnapshot();
      await db.transaction(async (tx) => {
        await tx
          .insert(storeConfig)
          .values({
            id: 1,
            settings: seed.settings,
            adminAuth: seed.adminAuth ?? null,
            adminOwnerUid: seed.adminOwnerUid ?? null,
            sessionSecret: seed.sessionSecret ?? null,
            catalogModified: Boolean(seed.catalogModified),
          })
          .onConflictDoNothing();

        if (seed.categories.length > 0) {
          await tx
            .insert(categories)
            .values(
              seed.categories.map((c, idx) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                brandKey: c.brandKey || 'custom',
                featured: c.featured !== false,
                active: c.active !== false,
                parentId: c.parentId || '',
                description: c.description || '',
                googleCategory: c.googleCategory || '',
                seoTitle: c.seoTitle || '',
                seoDescription: c.seoDescription || '',
                image: c.image || '',
                shippingClass: c.shippingClass || 'No class',
                sortOrder: idx,
              }))
            )
            .onConflictDoNothing();
        }

        if (seed.products.length > 0) {
          await tx
            .insert(products)
            .values(
              seed.products.map((p, idx) => ({
                id: p.id,
                title: p.title,
                slug: p.slug || '',
                category: p.category,
                brand: p.brand || '',
                alsoShowIn: p.alsoShowIn || [],
                brandModels: p.brandModels || [],
                variantOptions: p.variantOptions || [],
                variants: p.variants || [],
                price: p.price,
                originalPrice: p.originalPrice,
                costPrice: p.costPrice ?? 0,
                discountPercent: p.discountPercent ?? 0,
                stock: p.stock ?? 0,
                lowStockThreshold: p.lowStockThreshold ?? 5,
                trackStock: p.trackStock !== false,
                preOrderMode: p.preOrderMode || 'store_default',
                sku: p.sku || '',
                image: p.image,
                galleryImages: p.galleryImages || [],
                shortDescription: p.shortDescription || '',
                description: p.description || '',
                requiresShipping: p.requiresShipping !== false,
                weightKg: p.weightKg ?? 0.5,
                shippingClass: p.shippingClass || 'No class',
                specifications: p.specifications || [],
                customerPrompt: p.customerPrompt || '',
                seoTitle: p.seoTitle || '',
                seoDescription: p.seoDescription || '',
                active: p.active !== false,
                featured: Boolean(p.featured),
                createdAt: p.createdAt || new Date().toISOString(),
                sortOrder: idx,
              }))
            )
            .onConflictDoNothing();
        }

        if (seed.orders.length > 0) {
          await tx
            .insert(orders)
            .values(
              seed.orders.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                customerName: o.customerName,
                customerPhone: o.customerPhone,
                customerEmail: o.customerEmail || '',
                deliveryAddress: o.deliveryAddress,
                deliveryArea: o.deliveryArea,
                items: o.items,
                subtotal: o.subtotal,
                shippingFee: o.shippingFee,
                discountAmount: o.discountAmount ?? 0,
                couponCode: o.couponCode ?? null,
                total: o.total,
                paymentMethod: o.paymentMethod,
                paymentStatus: o.paymentStatus,
                fulfillmentStatus: o.fulfillmentStatus,
                transactionId: o.transactionId,
                source: o.source,
                channel: o.channel,
                createdAt: o.createdAt,
                updatedAt: o.updatedAt,
              }))
            )
            .onConflictDoNothing();
        }

        if (seed.subscribers.length > 0) {
          await tx
            .insert(subscribers)
            .values(
              seed.subscribers.map((s) => ({
                id: s.id,
                email: s.email,
                subscribedAt: s.subscribedAt,
              }))
            )
            .onConflictDoNothing();
        }

        if (seed.coupons.length > 0) {
          await tx
            .insert(coupons)
            .values(
              seed.coupons.map((c) => ({
                id: c.id,
                code: c.code,
                discountPercent: c.discountPercent,
                active: c.active !== false,
              }))
            )
            .onConflictDoNothing();
        }

        if (seed.expenses.length > 0) {
          await tx
            .insert(expenses)
            .values(
              seed.expenses.map((e) => ({
                id: e.id,
                title: e.title,
                category: e.category,
                amount: e.amount,
                date: e.date,
                note: e.note || '',
                createdAt: e.createdAt,
              }))
            )
            .onConflictDoNothing();
        }

        if (seed.reviews.length > 0) {
          await tx
            .insert(reviews)
            .values(
              seed.reviews.map((r) => ({
                id: r.id,
                productId: r.productId,
                authorName: r.authorName,
                deviceModel: r.deviceModel,
                rating: r.rating,
                comment: r.comment,
                verifiedPurchase: Boolean(r.verifiedPurchase),
                createdAt: r.createdAt,
              }))
            )
            .onConflictDoNothing();
        }
      });

      return seed;
    }

    const cfg = configRows[0];
    const [catRows, prodRows, ordRows, subRows, coupRows, expRows, revRows] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
      db.select().from(products).orderBy(asc(products.sortOrder), desc(products.createdAt)),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(subscribers).orderBy(desc(subscribers.subscribedAt)),
      db.select().from(coupons),
      db.select().from(expenses).orderBy(desc(expenses.createdAt)),
      db.select().from(reviews).orderBy(desc(reviews.createdAt)),
    ]);

    return {
      settings: cfg.settings,
      adminAuth: cfg.adminAuth ?? null,
      adminOwnerUid: cfg.adminOwnerUid ?? null,
      sessionSecret: cfg.sessionSecret ?? undefined,
      catalogModified: Boolean(cfg.catalogModified),
      categories: catRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        brandKey: (c.brandKey as Category['brandKey']) || 'custom',
        featured: c.featured,
        active: c.active,
        parentId: c.parentId,
        description: c.description,
        googleCategory: c.googleCategory,
        seoTitle: c.seoTitle,
        seoDescription: c.seoDescription,
        image: c.image,
        shippingClass: c.shippingClass,
      })),
      products: prodRows.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        brand: p.brand,
        alsoShowIn: p.alsoShowIn,
        brandModels: p.brandModels,
        variantOptions: p.variantOptions,
        variants: p.variants,
        price: p.price,
        originalPrice: p.originalPrice,
        costPrice: p.costPrice,
        discountPercent: p.discountPercent,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        trackStock: p.trackStock,
        preOrderMode: (p.preOrderMode as Product['preOrderMode']) || 'store_default',
        sku: p.sku,
        image: p.image,
        galleryImages: p.galleryImages,
        shortDescription: p.shortDescription,
        description: p.description,
        requiresShipping: p.requiresShipping,
        weightKg: p.weightKg,
        shippingClass: p.shippingClass,
        specifications: p.specifications,
        customerPrompt: p.customerPrompt,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        active: p.active,
        featured: p.featured,
        createdAt: p.createdAt,
      })),
      orders: ordRows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        deliveryAddress: o.deliveryAddress,
        deliveryArea: o.deliveryArea as Order['deliveryArea'],
        items: o.items,
        subtotal: o.subtotal,
        shippingFee: o.shippingFee,
        discountAmount: o.discountAmount,
        couponCode: o.couponCode ?? undefined,
        total: o.total,
        paymentMethod: o.paymentMethod as Order['paymentMethod'],
        paymentStatus: o.paymentStatus as Order['paymentStatus'],
        fulfillmentStatus: o.fulfillmentStatus as Order['fulfillmentStatus'],
        transactionId: o.transactionId,
        source: o.source as Order['source'],
        channel: o.channel,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      subscribers: subRows.map((s) => ({
        id: s.id,
        email: s.email,
        subscribedAt: s.subscribedAt,
      })),
      coupons: coupRows.map((c) => ({
        id: c.id,
        code: c.code,
        discountPercent: c.discountPercent,
        active: c.active,
      })),
      expenses: expRows.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: e.amount,
        date: e.date,
        note: e.note,
        createdAt: e.createdAt,
      })),
      reviews: revRows.map((r) => ({
        id: r.id,
        productId: r.productId,
        authorName: r.authorName,
        deviceModel: r.deviceModel,
        rating: r.rating,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    console.error('Database query failed in loadOrSeedStoreFromSql:', error);
    throw new Error('Failed to load store data from database.', { cause: error });
  }
}

export async function saveStoreConfigToSql(patch: {
  settings?: StoreSettings;
  adminAuth?: AdminAuthRecord | null;
  adminOwnerUid?: string | null;
  sessionSecret?: string;
  catalogModified?: boolean;
}) {
  try {
    await db
      .update(storeConfig)
      .set({
        ...(patch.settings !== undefined ? { settings: patch.settings } : {}),
        ...(patch.adminAuth !== undefined ? { adminAuth: patch.adminAuth } : {}),
        ...(patch.adminOwnerUid !== undefined ? { adminOwnerUid: patch.adminOwnerUid } : {}),
        ...(patch.sessionSecret !== undefined ? { sessionSecret: patch.sessionSecret } : {}),
        ...(patch.catalogModified !== undefined ? { catalogModified: patch.catalogModified } : {}),
        updatedAt: new Date(),
      })
      .where(eq(storeConfig.id, 1));
  } catch (error) {
    console.error('Database query failed in saveStoreConfigToSql:', error);
    throw new Error('Failed to save store configuration.', { cause: error });
  }
}

export async function upsertProductToSql(p: Product, sortOrder = 0) {
  try {
    await db
      .insert(products)
      .values({
        id: p.id,
        title: p.title,
        slug: p.slug || '',
        category: p.category,
        brand: p.brand || '',
        alsoShowIn: p.alsoShowIn || [],
        brandModels: p.brandModels || [],
        variantOptions: p.variantOptions || [],
        variants: p.variants || [],
        price: p.price,
        originalPrice: p.originalPrice,
        costPrice: p.costPrice ?? 0,
        discountPercent: p.discountPercent ?? 0,
        stock: p.stock ?? 0,
        lowStockThreshold: p.lowStockThreshold ?? 5,
        trackStock: p.trackStock !== false,
        preOrderMode: p.preOrderMode || 'store_default',
        sku: p.sku || '',
        image: p.image,
        galleryImages: p.galleryImages || [],
        shortDescription: p.shortDescription || '',
        description: p.description || '',
        requiresShipping: p.requiresShipping !== false,
        weightKg: p.weightKg ?? 0.5,
        shippingClass: p.shippingClass || 'No class',
        specifications: p.specifications || [],
        customerPrompt: p.customerPrompt || '',
        seoTitle: p.seoTitle || '',
        seoDescription: p.seoDescription || '',
        active: p.active !== false,
        featured: Boolean(p.featured),
        createdAt: p.createdAt || new Date().toISOString(),
        sortOrder,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          title: p.title,
          slug: p.slug || '',
          category: p.category,
          brand: p.brand || '',
          alsoShowIn: p.alsoShowIn || [],
          brandModels: p.brandModels || [],
          variantOptions: p.variantOptions || [],
          variants: p.variants || [],
          price: p.price,
          originalPrice: p.originalPrice,
          costPrice: p.costPrice ?? 0,
          discountPercent: p.discountPercent ?? 0,
          stock: p.stock ?? 0,
          lowStockThreshold: p.lowStockThreshold ?? 5,
          trackStock: p.trackStock !== false,
          preOrderMode: p.preOrderMode || 'store_default',
          sku: p.sku || '',
          image: p.image,
          galleryImages: p.galleryImages || [],
          shortDescription: p.shortDescription || '',
          description: p.description || '',
          requiresShipping: p.requiresShipping !== false,
          weightKg: p.weightKg ?? 0.5,
          shippingClass: p.shippingClass || 'No class',
          specifications: p.specifications || [],
          customerPrompt: p.customerPrompt || '',
          seoTitle: p.seoTitle || '',
          seoDescription: p.seoDescription || '',
          active: p.active !== false,
          featured: Boolean(p.featured),
        },
      });
  } catch (error) {
    console.error('Database query failed in upsertProductToSql:', error);
    throw new Error('Failed to save product to database.', { cause: error });
  }
}

export async function replaceProductsInSql(list: Product[]) {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(products);
      if (list.length > 0) {
        await tx.insert(products).values(
          list.map((p, idx) => ({
            id: p.id,
            title: p.title,
            slug: p.slug || '',
            category: p.category,
            brand: p.brand || '',
            alsoShowIn: p.alsoShowIn || [],
            brandModels: p.brandModels || [],
            variantOptions: p.variantOptions || [],
            variants: p.variants || [],
            price: p.price,
            originalPrice: p.originalPrice,
            costPrice: p.costPrice ?? 0,
            discountPercent: p.discountPercent ?? 0,
            stock: p.stock ?? 0,
            lowStockThreshold: p.lowStockThreshold ?? 5,
            trackStock: p.trackStock !== false,
            preOrderMode: p.preOrderMode || 'store_default',
            sku: p.sku || '',
            image: p.image,
            galleryImages: p.galleryImages || [],
            shortDescription: p.shortDescription || '',
            description: p.description || '',
            requiresShipping: p.requiresShipping !== false,
            weightKg: p.weightKg ?? 0.5,
            shippingClass: p.shippingClass || 'No class',
            specifications: p.specifications || [],
            customerPrompt: p.customerPrompt || '',
            seoTitle: p.seoTitle || '',
            seoDescription: p.seoDescription || '',
            active: p.active !== false,
            featured: Boolean(p.featured),
            createdAt: p.createdAt || new Date().toISOString(),
            sortOrder: idx,
          }))
        );
      }
      await tx
        .update(storeConfig)
        .set({ catalogModified: true, updatedAt: new Date() })
        .where(eq(storeConfig.id, 1));
    });
  } catch (error) {
    console.error('Database query failed in replaceProductsInSql:', error);
    throw new Error('Failed to synchronize product catalog.', { cause: error });
  }
}

export async function deleteProductFromSql(productId: string) {
  try {
    await db.delete(products).where(eq(products.id, productId));
  } catch (error) {
    console.error('Database query failed in deleteProductFromSql:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export async function upsertCategoryToSql(c: Category, sortOrder = 0) {
  try {
    await db
      .insert(categories)
      .values({
        id: c.id,
        name: c.name,
        slug: c.slug,
        brandKey: c.brandKey || 'custom',
        featured: c.featured !== false,
        active: c.active !== false,
        parentId: c.parentId || '',
        description: c.description || '',
        googleCategory: c.googleCategory || '',
        seoTitle: c.seoTitle || '',
        seoDescription: c.seoDescription || '',
        image: c.image || '',
        shippingClass: c.shippingClass || 'No class',
        sortOrder,
      })
      .onConflictDoUpdate({
        target: categories.id,
        set: {
          name: c.name,
          slug: c.slug,
          brandKey: c.brandKey || 'custom',
          featured: c.featured !== false,
          active: c.active !== false,
          parentId: c.parentId || '',
          description: c.description || '',
          googleCategory: c.googleCategory || '',
          seoTitle: c.seoTitle || '',
          seoDescription: c.seoDescription || '',
          image: c.image || '',
          shippingClass: c.shippingClass || 'No class',
        },
      });
  } catch (error) {
    console.error('Database query failed in upsertCategoryToSql:', error);
    throw new Error('Failed to save category.', { cause: error });
  }
}

export async function deleteCategoryFromSql(categoryId: string) {
  try {
    await db.delete(categories).where(eq(categories.id, categoryId));
  } catch (error) {
    console.error('Database query failed in deleteCategoryFromSql:', error);
    throw new Error('Failed to delete category.', { cause: error });
  }
}

export async function insertOrderToSql(
  o: Order,
  settings: StoreSettings,
  updatedProducts: Product[],
  userId?: number
) {
  try {
    await db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: o.id,
        orderNumber: o.orderNumber,
        userId: userId ?? null,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail || '',
        deliveryAddress: o.deliveryAddress,
        deliveryArea: o.deliveryArea,
        items: o.items,
        subtotal: o.subtotal,
        shippingFee: o.shippingFee,
        discountAmount: o.discountAmount ?? 0,
        couponCode: o.couponCode ?? null,
        total: o.total,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        transactionId: o.transactionId,
        source: o.source,
        channel: o.channel,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      });

      await tx
        .update(storeConfig)
        .set({ settings, updatedAt: new Date() })
        .where(eq(storeConfig.id, 1));

      for (const prod of updatedProducts) {
        await tx
          .update(products)
          .set({ stock: prod.stock })
          .where(eq(products.id, prod.id));
      }
    });
  } catch (error) {
    console.error('Database query failed in insertOrderToSql:', error);
    throw new Error('Failed to record order.', { cause: error });
  }
}

export async function updateOrderInSql(o: Order) {
  try {
    await db
      .update(orders)
      .set({
        fulfillmentStatus: o.fulfillmentStatus,
        paymentStatus: o.paymentStatus,
        updatedAt: o.updatedAt,
      })
      .where(eq(orders.id, o.id));
  } catch (error) {
    console.error('Database query failed in updateOrderInSql:', error);
    throw new Error('Failed to update order status.', { cause: error });
  }
}

export async function insertReviewToSql(r: ProductReview) {
  try {
    await db.insert(reviews).values({
      id: r.id,
      productId: r.productId,
      authorName: r.authorName,
      deviceModel: r.deviceModel,
      rating: r.rating,
      comment: r.comment,
      verifiedPurchase: Boolean(r.verifiedPurchase),
      createdAt: r.createdAt,
    });
  } catch (error) {
    console.error('Database query failed in insertReviewToSql:', error);
    throw new Error('Failed to save product review.', { cause: error });
  }
}

export async function insertSubscriberToSql(s: Subscriber) {
  try {
    await db
      .insert(subscribers)
      .values({
        id: s.id,
        email: s.email,
        subscribedAt: s.subscribedAt,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database query failed in insertSubscriberToSql:', error);
    throw new Error('Failed to save newsletter subscription.', { cause: error });
  }
}

export async function insertCouponToSql(c: Coupon) {
  try {
    await db.insert(coupons).values({
      id: c.id,
      code: c.code,
      discountPercent: c.discountPercent,
      active: c.active,
    });
  } catch (error) {
    console.error('Database query failed in insertCouponToSql:', error);
    throw new Error('Failed to create coupon.', { cause: error });
  }
}

export async function insertExpenseToSql(e: Expense) {
  try {
    await db.insert(expenses).values({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      date: e.date,
      note: e.note,
      createdAt: e.createdAt,
    });
  } catch (error) {
    console.error('Database query failed in insertExpenseToSql:', error);
    throw new Error('Failed to save expense.', { cause: error });
  }
}

export async function deleteExpenseFromSql(expenseId: string) {
  try {
    await db.delete(expenses).where(eq(expenses.id, expenseId));
  } catch (error) {
    console.error('Database query failed in deleteExpenseFromSql:', error);
    throw new Error('Failed to delete expense.', { cause: error });
  }
}
