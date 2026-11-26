import { Router } from 'express';
import * as controller from '../controllers/plant-controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  careEventSchema,
  idParamSchema,
  plantPatchSchema,
  plantSchema
} from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);
router.get('/species', controller.listSpecies);
router.get('/', controller.list);
router.post('/', validate(plantSchema), controller.create);
router.get('/:id/care-events', validate(idParamSchema, 'params'), controller.listCareEvents);
router.post('/:id/care-events', validate(idParamSchema, 'params'), validate(careEventSchema), controller.createCareEvent);
router.get('/:id', validate(idParamSchema, 'params'), controller.get);
router.patch('/:id', validate(idParamSchema, 'params'), validate(plantPatchSchema), controller.update);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);
export default router;
