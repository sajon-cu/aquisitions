import {signUpSchema} from '#validations/auth.validation.js';
import {formatValidation} from '#utils/format.js';
import {createUser} from '#services/auth.service.js';
import {cookies} from '#utils/cookies.js';
import {jwtToken} from '#utils/jwt.js';

export const signup = async (req, res, next) => {
    try {
        const validationResult = signUpSchema.safeParse(req.body);
        if(!validationResult.success) {
            res.status(400).send({ success: false, message: formatValidation(validationResult.error) });
        }

        // Call Auth Service
        const { name, email, role, password } = validationResult.data;
        const user = await createUser({name, email, password, role });

        const token = jwtToken.sign({ id: user.id, email: user.email, role: user.role });
        cookies.set(res, 'token', token);

        res.status(201).send({
            success: true,
            message: 'User registration successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        });
    } catch (e) {
        if(e.message === 'User already exists with this email.') {
            res.status(409).send({ error: 'User already exists with this email.' });
        }

        next(e);
    }
};