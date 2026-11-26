import { desc, eq } from 'drizzle-orm';
import type { CustomerAccountStatus, CustomerProfile, CustomerSavedAddress } from '../types.ts';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, role?: 'admin' | 'customer') {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const current = existing[0];
      const nextRole = role ?? current.role;
      const nextEmail = email || current.email;
      const now = new Date();
      const updated = await db
        .update(users)
        .set({ email: nextEmail, role: nextRole, lastLoginAt: now })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0] ?? current;
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        role: role ?? 'customer',
        status: 'active',
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          lastLoginAt: new Date(),
          ...(role ? { role } : {}),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Failed to load user account.', { cause: error });
  }
}

export async function upsertCustomerProfileToSql(profile: CustomerProfile) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, profile.uid)).limit(1);
    const now = new Date();
    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email: profile.email || existing[0].email,
          displayName: profile.displayName ?? existing[0].displayName,
          phone: profile.phone ?? existing[0].phone,
          district: profile.district ?? existing[0].district,
          address: profile.address ?? existing[0].address,
          deliveryArea: profile.deliveryArea || existing[0].deliveryArea,
          photoUrl: profile.photoUrl ?? existing[0].photoUrl,
          addresses: Array.isArray(profile.addresses) ? profile.addresses : existing[0].addresses,
          status: profile.status || existing[0].status,
          deactivatedAt: profile.deactivatedAt ?? existing[0].deactivatedAt,
          adminNote: profile.adminNote ?? existing[0].adminNote,
          updatedAt: now,
        })
        .where(eq(users.uid, profile.uid))
        .returning();
      return updated[0] ?? existing[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid: profile.uid,
        email: profile.email,
        role: 'customer',
        displayName: profile.displayName,
        phone: profile.phone,
        district: profile.district,
        address: profile.address,
        deliveryArea: profile.deliveryArea,
        photoUrl: profile.photoUrl,
        addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
        status: profile.status || 'active',
        deactivatedAt: profile.deactivatedAt || '',
        adminNote: profile.adminNote || '',
        lastLoginAt: now,
        updatedAt: now,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in upsertCustomerProfileToSql:', error);
    throw new Error('Failed to save customer profile to database.', { cause: error });
  }
}

export async function updateCustomerStatusInSql(
  uid: string,
  status: CustomerAccountStatus,
  adminNote?: string
) {
  try {
    const now = new Date();
    const updated = await db
      .update(users)
      .set({
        status,
        deactivatedAt: status === 'deactivated' ? now.toISOString() : '',
        ...(adminNote !== undefined ? { adminNote } : {}),
        updatedAt: now,
      })
      .where(eq(users.uid, uid))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateCustomerStatusInSql:', error);
    throw new Error('Failed to update customer status.', { cause: error });
  }
}

export async function listAllCustomerUsersFromSql(): Promise<CustomerProfile[]> {
  try {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    return rows.map((row) => ({
      uid: row.uid,
      email: row.email,
      displayName: row.displayName || '',
      phone: row.phone || '',
      district: row.district || '',
      address: row.address || '',
      deliveryArea: row.deliveryArea === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka',
      photoUrl: row.photoUrl || '',
      status: row.status === 'deactivated' ? 'deactivated' : 'active',
      addresses: Array.isArray(row.addresses) ? (row.addresses as CustomerSavedAddress[]) : [],
      deactivatedAt: row.deactivatedAt || undefined,
      adminNote: row.adminNote || undefined,
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : undefined,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed in listAllCustomerUsersFromSql:', error);
    return [];
  }
}
