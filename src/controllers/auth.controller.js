import {signUpSchema} from '#validations/auth.validation.js';
import {formatValidation} from '#utils/format.js';

export const signup = async (req, res, next) => {
    try {
        const validationResult = signUpSchema.safeParse(req.body);
        if(!validationResult.success) {
            res.status(400).send({ success: false, message: formatValidation(validationResult.error) });
        }

        // Call Auth Service
        const { name, email, role, password } = validationResult.data;

        res.status(201).send({
            success: true,
            message: 'User registration successfully',
            user: {
                id: 1,
                name,
                email,
                role
            }
        });
    } catch (e) {
        if(e.message === 'User already exists with this email.') {
            res.status(409).send({ error: 'User already exists with this email.' });
        }

        next(e);
    }
};