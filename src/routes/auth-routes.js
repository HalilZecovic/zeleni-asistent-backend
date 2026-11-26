import { Router } from 'express';
import * as controller from '../controllers/auth-controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

const router = Router();
router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/logout', requireAuth, controller.logout);
export default router;
