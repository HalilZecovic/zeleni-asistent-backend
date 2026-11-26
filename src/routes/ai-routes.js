import { Router } from 'express';
import * as controller from '../controllers/ai-controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiQuestionSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);
router.post('/ask', validate(aiQuestionSchema), controller.ask);
router.get('/sessions', controller.listSessions);
router.get('/sessions/:id/messages', validate(idParamSchema, 'params'), controller.listMessages);
export default router;
