import { Router } from 'express';
import * as project from '../controllers/project.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', requireRole('ADMIN', 'USER', 'VIEWER'), project.list);
router.post('/', requireRole('ADMIN', 'USER'), project.create);
router.patch('/:projectId', requireRole('ADMIN', 'USER'), project.update);
router.delete('/:projectId', requireRole('ADMIN'), project.remove);

export default router;
