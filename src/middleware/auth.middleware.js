import { cookies } from '#utils/cookies.js';
import { jwtToken } from '#utils/jwt.js';

export const authenticateToken = (req, res, next) => {
    try {
        const token = cookies.get(req, 'token');
        if (!token) {
            return res
                .status(401)
                .send({ success: false, message: 'Authentication required' });
        }
        req.user = jwtToken.verify(token);
        next();
    } catch {
        return res
            .status(401)
            .send({ success: false, message: 'Invalid or expired token' });
    }
};

export const requireRole = (roles = []) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        if (!req.user) {
            return res
                .status(401)
                .send({ success: false, message: 'Authentication required' });
        }
        if (!allowed.includes(req.user.role)) {
            return res.status(403).send({
                success: false,
                message: `Access denied. Required role: ${allowed.join(' or ')}`,
            });
        }
        next();
    };
};
