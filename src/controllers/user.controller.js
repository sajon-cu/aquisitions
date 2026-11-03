import logger from '#config/logger.js';
import { formatValidation } from '#utils/format.js';
import {
    getAllUsers as getAllUsersService,
    getUserById as getUserByIdService,
    updateUser as updateUserService,
    deleteUser as deleteUserService,
} from '#services/user.service.js';
import {
    userIdSchema,
    updateUserSchema,
} from '#validations/user.validation.js';

const parseId = (req, res) => {
    const result = userIdSchema.safeParse(req.params);
    if (!result.success) {
        res.status(400).send({
            success: false,
            message: formatValidation(result.error),
        });
        return null;
    }
    return result.data.id;
};

const handleError = (e, res, next) => {
    logger.error('User request failed', e);
    if (e.message === 'User not found') {
        return res
            .status(404)
            .send({ success: false, message: 'User not found' });
    }
    if (e.message === 'User already exists with this email.') {
        return res.status(409).send({ success: false, message: e.message });
    }
    return next(e);
};

const canAccess = (req, id) => req.user.role === 'admin' || req.user.id === id;

export const getAllUsers = async (req, res, next) => {
    try {
        const allUsers = await getAllUsersService();
        logger.info('Fetched all users');
        return res
            .status(200)
            .send({ success: true, count: allUsers.length, users: allUsers });
    } catch (e) {
        next(e);
    }
};

export const getUserById = async (req, res, next) => {
    try {
        const id = parseId(req, res);
        if (id === null) return;
        if (!canAccess(req, id)) {
            return res
                .status(403)
                .send({ success: false, message: 'Forbidden' });
        }
        const user = await getUserByIdService(id);
        logger.info(`Fetched user ${id}`);
        return res.status(200).send({ success: true, user });
    } catch (e) {
        handleError(e, res, next);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const id = parseId(req, res);
        if (id === null) return;
        if (!canAccess(req, id)) {
            return res
                .status(403)
                .send({ success: false, message: 'Forbidden' });
        }

        const result = updateUserSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).send({
                success: false,
                message: formatValidation(result.error),
            });
        }
        if (result.data.role && req.user.role !== 'admin') {
            return res.status(403).send({
                success: false,
                message: 'Only admins can change roles',
            });
        }

        const user = await updateUserService(id, result.data);
        logger.info(`User ${id} updated by ${req.user.id}`);
        return res.status(200).send({
            success: true,
            message: 'User updated successfully',
            user,
        });
    } catch (e) {
        handleError(e, res, next);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const id = parseId(req, res);
        if (id === null) return;
        if (!canAccess(req, id)) {
            return res
                .status(403)
                .send({ success: false, message: 'Forbidden' });
        }
        await deleteUserService(id);
        logger.info(`User ${id} deleted by ${req.user.id}`);
        return res
            .status(200)
            .send({ success: true, message: 'User deleted successfully' });
    } catch (e) {
        handleError(e, res, next);
    }
};
