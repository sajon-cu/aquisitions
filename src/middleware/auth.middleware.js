import { cookies } from '#utils/cookies.js';
import { jwtToken } from '#utils/jwt.js';

export const authenticate = (req, res, next) => {
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

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res
            .status(403)
            .send({ success: false, message: 'Admin access required' });
    }
    next();
};
