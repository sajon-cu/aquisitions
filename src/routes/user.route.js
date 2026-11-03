import express from 'express';
import { authenticate, requireAdmin } from '#middleware/auth.middleware.js';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from '#controllers/user.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requireAdmin, getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
