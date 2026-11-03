import logger from '#config/logger.js';
import { signUpSchema, signInSchema } from '#validations/auth.validation.js';
import { formatValidation } from '#utils/format.js';
import { createUser, authenticateUser } from '#services/auth.service.js';
import { cookies } from '#utils/cookies.js';
import { jwtToken } from '#utils/jwt.js';

export const signup = async (req, res, next) => {
    try {
        const validationResult = signUpSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).send({
                success: false,
                message: formatValidation(validationResult.error),
            });
        }

        // Call Auth Service
        const { name, email, role, password } = validationResult.data;
        const user = await createUser({ name, email, password, role });

        const token = jwtToken.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        cookies.set(res, 'token', token);

        res.status(201).send({
            success: true,
            message: 'User registration successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (e) {
        if (e.message === 'User already exists with this email.') {
            res.status(409).send({
                error: 'User already exists with this email.',
            });
        }

        next(e);
    }
};

export const signIn = async (req, res, next) => {
    try {
        const validationResult = signInSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).send({
                success: false,
                message: formatValidation(validationResult.error),
            });
        }

        const { email, password } = validationResult.data;
        const user = await authenticateUser({ email, password });

        const token = jwtToken.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        cookies.set(res, 'token', token);

        logger.info(`User signed in successfully: ${email}`);
        return res.status(200).send({
            success: true,
            message: 'User signed in successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (e) {
        logger.error('Sign in error', e);
        if (
            e.message === 'User not found' ||
            e.message === 'Invalid password'
        ) {
            return res
                .status(401)
                .send({ success: false, message: 'Invalid email or password' });
        }

        next(e);
    }
};

export const signOut = async (req, res, next) => {
    try {
        cookies.clear(res, 'token');

        logger.info('User signed out successfully');
        return res
            .status(200)
            .send({ success: true, message: 'User signed out successfully' });
    } catch (e) {
        logger.error('Sign out error', e);
        next(e);
    }
};
