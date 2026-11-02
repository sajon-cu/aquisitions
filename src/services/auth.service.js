import bcrypt from 'bcrypt';
import logger from '#config/logger.js';
import {db} from '#config/database.js';
import {users} from '#models/user.model.js';
import {eq} from 'drizzle-orm';

export const hashPassword = async (password) => {
    try {
        return bcrypt.hash(password, 10);
    } catch (e) {
        logger.error('Failed to hash password', e);
        throw new Error('Error hashing password');
    }
};

export const createUser = async ({ name, email, password, role = 'user' }) => {
    try {
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        logger.info('@User already exists', existingUser);
        if(existingUser.length > 0) {
            throw new Error('User already exists');
        }

        const hashedPassword = await hashPassword(password);
        console.log(hashedPassword, password, role, name, email, password);
        const [newUser] = await db
            .insert(users)
            .values({ name, email, password: hashedPassword, role })
            .returning({ id: users.id, name: users.name, email: users.email, role: users.role, created_at: users.created_at });

        logger.info(`User ${newUser.email} create successfully.`);
        return newUser;
    } catch (e) {
        logger.error('Failed to create user', e);
        throw e;
    }
};