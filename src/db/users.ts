import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, role?: 'admin' | 'customer') {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const current = existing[0];
      const nextRole = role ?? current.role;
      const nextEmail = email || current.email;
      if (nextRole !== current.role || nextEmail !== current.email) {
        const updated = await db
          .update(users)
          .set({ email: nextEmail, role: nextRole })
          .where(eq(users.uid, uid))
          .returning();
        return updated[0];
      }
      return current;
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        role: role ?? 'customer',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
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
