# Role-Based Access Control (RBAC)

How authentication and authorization work in this API, and how to evolve it as roles grow.

## Contents

1. [Overview](#1-overview)
2. [Current implementation](#2-current-implementation)
3. [Access matrix](#3-access-matrix)
4. [Request flow](#4-request-flow)
5. [Adding protection to a new route](#5-adding-protection-to-a-new-route)
6. [Known issues](#6-known-issues)
7. [Scaling path](#7-scaling-path)
8. [Guidelines](#8-guidelines)

---

## 1. Overview

| Concern                             | Where                                                            |
| ----------------------------------- | ---------------------------------------------------------------- |
| Who is the caller? (authentication) | `authenticateToken` in `src/middleware/auth.middleware.js`       |
| What may they do? (authorization)   | `requireRole(roles)` in the same file                            |
| Role storage                        | `users.role` column (`src/models/user.model.js`), default `user` |
| Role transport                      | JWT payload, sent in the `token` httpOnly cookie                 |
| Defined roles                       | `admin`, `user` (zod enums in `src/validations/`)                |

Authorization is applied **per route**. There is no global `router.use(authenticate)`, so each route states exactly what it needs.

## 2. Current implementation

### `authenticateToken`

Reads the `token` cookie, verifies the JWT and sets `req.user` (`{ id, email, role }`).

| Situation                | Response                         |
| ------------------------ | -------------------------------- |
| No cookie                | `401` `Authentication required`  |
| Invalid or expired token | `401` `Invalid or expired token` |

### `requireRole(roles)`

Takes an array of roles (a single string also works) and must run **after** `authenticateToken`.

| Situation            | Response                                           |
| -------------------- | -------------------------------------------------- |
| `req.user` missing   | `401` `Authentication required`                    |
| Role not in the list | `403` `Access denied. Required role: admin or ...` |
| Role in the list     | `next()`                                           |

### Route usage (`src/routes/user.route.js`)

```js
// GET /users - Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), getAllUsers);

// GET /users/:id - Get user by ID (admin, or the user's own profile)
router.get('/:id', authenticateToken, getUserById);

// PUT /users/:id - Update user by ID (own profile, or admin for any)
router.put('/:id', authenticateToken, updateUser);

// DELETE /users/:id - Delete user by ID (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteUser);
```

Ownership rules ("own profile") are enforced in the controller via `canAccess(req, id)` in `src/controllers/user.controller.js`. Changing a user's `role` in `PUT /users/:id` is additionally restricted to admins.

## 3. Access matrix

| Endpoint              | Guest |             `user`              | `admin` |
| --------------------- | :---: | :-----------------------------: | :-----: |
| `POST /auth/sign-up`  |  yes  |               yes               |   yes   |
| `POST /auth/sign-in`  |  yes  |               yes               |   yes   |
| `POST /auth/sign-out` |  yes  |               yes               |   yes   |
| `GET /users`          |  401  |               403               |   yes   |
| `GET /users/:id`      |  401  |            own only             |   yes   |
| `PUT /users/:id`      |  401  | own only (cannot change `role`) |   yes   |
| `DELETE /users/:id`   |  401  |               403               |   yes   |

Rate limits (Arcjet, `src/middleware/security.middleware.js`) also depend on role: guest 5/min, user 10/min, admin 20/min.

## 4. Request flow

```
Request
  |
  v
security middleware (Arcjet: bot / shield / rate limit by role)
  |
  v
authenticateToken ---- no/invalid token ----> 401
  |  sets req.user
  v
requireRole([...]) ---- role not allowed ----> 403
  |
  v
controller (ownership checks, e.g. canAccess) -> 403 if not owner/admin
  |
  v
service / database
```

## 5. Adding protection to a new route

```js
import { authenticateToken, requireRole } from '#middleware/auth.middleware.js';

// Any logged-in user
router.get('/reports', authenticateToken, listReports);

// Specific roles
router.post(
    '/reports',
    authenticateToken,
    requireRole(['admin', 'manager']),
    createReport
);
```

Checklist:

- [ ] `authenticateToken` comes **before** `requireRole`
- [ ] Roles are listed explicitly (deny by default)
- [ ] Add a comment above the route describing who can call it
- [ ] If the role is new, add it to the zod enums in `src/validations/` and the access matrix above

## 6. Known issues

| #   | Issue                                                                                                                  | Impact                                                                 | Suggested fix                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `POST /auth/sign-up` accepts `role` from the request body (`src/validations/auth.validation.js`, `auth.controller.js`) | **Anyone can register as `admin`** (privilege escalation)              | Remove `role` from the sign-up schema and always create `user`. Promote users through an admin-only endpoint |
| 2   | Role is stored in the JWT (1-day lifetime)                                                                             | A demoted or deleted user keeps their old role until the token expires | Keep tokens short-lived, or re-check the role in the DB for sensitive actions                                |
| 3   | Cookie `maxAge` is 15 minutes but the JWT lives 1 day                                                                  | Session length is inconsistent                                         | Align both values                                                                                            |
| 4   | `JWT_SECRET` falls back to a hard-coded default (`src/utils/jwt.js`)                                                   | Forgeable tokens if the env var is missing                             | Throw at startup when it is unset in production                                                              |

## 7. Scaling path

`requireRole` is enough for a few fixed roles. Move up only when the pain appears.

| Level | Pattern                                                     | Move here when                                       |
| :---: | ----------------------------------------------------------- | ---------------------------------------------------- |
|   1   | `requireRole(['admin'])` (**current**)                      | 2-4 roles, simple rules                              |
|   2   | Role to permissions map, `requirePermission('user:delete')` | Adding a role means editing many routes              |
|   3   | Roles and permissions in DB tables, cached                  | Roles must be editable at runtime, or multi-tenant   |
|   4   | Policy/attribute-based (CASL, Casbin)                       | Conditional rules ("only in own org", "only drafts") |

### Level 2 sketch

```js
// src/config/permissions.js
const user = ['user:read:own', 'user:update:own'];
const admin = [...user, 'user:read:any', 'user:update:any', 'user:delete:any'];

export const ROLE_PERMISSIONS = { user, admin };
export const hasPermission = (role, permission) =>
    ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
```

```js
// src/middleware/auth.middleware.js
export const requirePermission =
    (...permissions) =>
    (req, res, next) => {
        if (!req.user)
            return res
                .status(401)
                .send({ success: false, message: 'Authentication required' });
        if (!permissions.some(p => hasPermission(req.user.role, p))) {
            return res
                .status(403)
                .send({ success: false, message: 'Forbidden' });
        }
        next();
    };
```

```js
router.delete(
    '/:id',
    authenticateToken,
    requirePermission('user:delete:any'),
    deleteUser
);
```

### Level 3 sketch (Drizzle)

```js
export const roles = pgTable('roles', {
    id: serial().primaryKey(),
    name: varchar().unique(),
});
export const permissions = pgTable('permissions', {
    id: serial().primaryKey(),
    key: varchar().unique(),
});
export const rolePermissions = pgTable(
    'role_permissions',
    {
        roleId: integer().references(() => roles.id),
        permissionId: integer().references(() => permissions.id),
    },
    t => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);
```

Resolve permissions server-side from a cache (in-memory with TTL, or Redis). Do not embed the full permission list in the JWT.

## 8. Guidelines

1. **Deny by default.** Unknown roles or permissions are rejected.
2. **Authorize in middleware, not scattered in controllers.** Ownership checks are the one exception until they move into middleware.
3. **Never trust the client.** The role claim is verified server-side on every request.
4. **Keep the role list in one place.** Reuse a shared constant instead of repeating `'admin'` / `'user'` strings.
5. **Test the matrix.** Cover each endpoint for guest, `user` and `admin`, including the ownership cases.
6. **Log denials.** 401/403 events help detect probing and misconfiguration.
