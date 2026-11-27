import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  CustomerSavedAddress,
  OrderItem,
  ProductSpecification,
  ProductVariant,
  ProductVariantOption,
  StoreSettings,
} from '../types.ts';

export interface AdminAuthRecord {
  salt: string;
  passwordHash: string;
  claimedAt: string;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('customer'),
  displayName: text('display_name').default('').notNull(),
  phone: text('phone').default('').notNull(),
  district: text('district').default('').notNull(),
  address: text('address').default('').notNull(),
  deliveryArea: text('delivery_area').default('inside_dhaka').notNull(),
  photoUrl: text('photo_url').default('').notNull(),
  addresses: jsonb('addresses').$type<CustomerSavedAddress[]>().default([]).notNull(),
  status: text('status').default('active').notNull(),
  deactivatedAt: text('deactivated_at').default('').notNull(),
  adminNote: text('admin_note').default('').notNull(),
  passwordSalt: text('password_salt').default('').notNull(),
  passwordHash: text('password_hash').default('').notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const storeConfig = pgTable('store_config', {
  id: integer('id').primaryKey(),
  settings: jsonb('settings').$type<StoreSettings>().notNull(),
  adminAuth: jsonb('admin_auth').$type<AdminAuthRecord | null>(),
  adminOwnerUid: text('admin_owner_uid'),
  sessionSecret: text('session_secret'),
  catalogModified: boolean('catalog_modified').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  brandKey: text('brand_key').notNull().default('custom'),
  featured: boolean('featured').default(true).notNull(),
  active: boolean('active').default(true).notNull(),
  parentId: text('parent_id').default('').notNull(),
  description: text('description').default('').notNull(),
  googleCategory: text('google_category').default('').notNull(),
  seoTitle: text('seo_title').default('').notNull(),
  seoDescription: text('seo_description').default('').notNull(),
  image: text('image').default('').notNull(),
  shippingClass: text('shipping_class').default('No class').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').default('').notNull(),
  category: text('category').notNull(),
  brand: text('brand').default('').notNull(),
  alsoShowIn: jsonb('also_show_in').$type<string[]>().default([]).notNull(),
  brandModels: jsonb('brand_models').$type<string[]>().default([]).notNull(),
  variantOptions: jsonb('variant_options').$type<ProductVariantOption[]>().default([]).notNull(),
  variants: jsonb('variants').$type<ProductVariant[]>().default([]).notNull(),
  price: doublePrecision('price').notNull(),
  originalPrice: doublePrecision('original_price').notNull(),
  costPrice: doublePrecision('cost_price').default(0).notNull(),
  discountPercent: integer('discount_percent').default(0).notNull(),
  stock: integer('stock').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
  trackStock: boolean('track_stock').default(true).notNull(),
  preOrderMode: text('pre_order_mode').default('store_default').notNull(),
  sku: text('sku').default('').notNull(),
  image: text('image').notNull(),
  galleryImages: jsonb('gallery_images').$type<string[]>().default([]).notNull(),
  shortDescription: text('short_description').default('').notNull(),
  description: text('description').default('').notNull(),
  requiresShipping: boolean('requires_shipping').default(true).notNull(),
  weightKg: doublePrecision('weight_kg').default(0.5).notNull(),
  shippingClass: text('shipping_class').default('No class').notNull(),
  specifications: jsonb('specifications').$type<ProductSpecification[]>().default([]).notNull(),
  customerPrompt: text('customer_prompt').default('').notNull(),
  seoTitle: text('seo_title').default('').notNull(),
  seoDescription: text('seo_description').default('').notNull(),
  active: boolean('active').default(true).notNull(),
  featured: boolean('featured').default(false).notNull(),
  createdAt: text('created_at').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  userId: integer('user_id').references(() => users.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').default('').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryArea: text('delivery_area').notNull(),
  items: jsonb('items').$type<OrderItem[]>().notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  shippingFee: doublePrecision('shipping_fee').notNull(),
  discountAmount: doublePrecision('discount_amount').default(0).notNull(),
  couponCode: text('coupon_code'),
  total: doublePrecision('total').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull(),
  fulfillmentStatus: text('fulfillment_status').notNull(),
  transactionId: text('transaction_id').notNull(),
  source: text('source').notNull(),
  channel: text('channel').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const subscribers = pgTable('subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  subscribedAt: text('subscribed_at').notNull(),
});

export const coupons = pgTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountPercent: integer('discount_percent').notNull(),
  active: boolean('active').default(true).notNull(),
});

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(),
  note: text('note').default('').notNull(),
  createdAt: text('created_at').notNull(),
});

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  authorName: text('author_name').notNull(),
  deviceModel: text('device_model').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  verifiedPurchase: boolean('verified_purchase').default(false).notNull(),
  createdAt: text('created_at').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

export const heroMedia = pgTable('hero_media', {
  filename: text('filename').primaryKey(),
  mimeType: text('mime_type').notNull().default('video/mp4'),
  sizeBytes: integer('size_bytes').notNull().default(0),
  dataBase64: text('data_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
