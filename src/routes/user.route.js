import express from 'express';
import { authenticateToken, requireRole } from '#middleware/auth.middleware.js';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from '#controllers/user.controller.js';

const router = express.Router();

// GET /users - Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), getAllUsers);

// GET /users/:id - Get user by ID (admin, or the user's own profile)
router.get('/:id', authenticateToken, getUserById);

// PUT /users/:id - Update user by ID (users can update their own profile, admin can update any)
router.put('/:id', authenticateToken, updateUser);

// DELETE /users/:id - Delete user by ID (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteUser);

export default router;
