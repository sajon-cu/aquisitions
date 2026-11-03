import { db } from '#config/database.js';
import { users } from '#models/user.model.js';
import logger from '#config/logger.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '#services/auth.service.js';

const publicColumns = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    created_at: users.created_at,
    updated_at: users.updated_at,
};

export const getAllUsers = async () => {
    try {
        return await db.select(publicColumns).from(users);
    } catch (error) {
        logger.error('Error getting users', error);
        throw error;
    }
};

export const getUserById = async id => {
    try {
        const [user] = await db
            .select(publicColumns)
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!user) throw new Error('User not found');
        return user;
    } catch (error) {
        logger.error(`Error getting user ${id}`, error);
        throw error;
    }
};

export const updateUser = async (id, updates) => {
    try {
        await getUserById(id);

        if (updates.email) {
            const [existing] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, updates.email))
                .limit(1);
            if (existing && existing.id !== id) {
                throw new Error('User already exists with this email.');
            }
        }

        const values = { ...updates, updated_at: new Date() };
        if (updates.password) {
            values.password = await hashPassword(updates.password);
        }

        const [updated] = await db
            .update(users)
            .set(values)
            .where(eq(users.id, id))
            .returning(publicColumns);

        logger.info(`User ${updated.email} updated successfully.`);
        return updated;
    } catch (error) {
        logger.error(`Error updating user ${id}`, error);
        throw error;
    }
};

export const deleteUser = async id => {
    try {
        const [deleted] = await db
            .delete(users)
            .where(eq(users.id, id))
            .returning({ id: users.id, email: users.email });
        if (!deleted) throw new Error('User not found');

        logger.info(`User ${deleted.email} deleted successfully.`);
        return deleted;
    } catch (error) {
        logger.error(`Error deleting user ${id}`, error);
        throw error;
    }
};
