import { Router } from 'express';
import * as workspace from '../controllers/workspace.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.use(requireAuth);

router.get('/', workspace.listMine);
router.post('/', workspace.create);
router.get('/:workspaceId', requireRole('ADMIN', 'USER', 'VIEWER'), workspace.getOne);
router.patch('/:workspaceId', requireRole('ADMIN'), workspace.update);
router.delete('/:workspaceId', requireRole('ADMIN'), workspace.remove);

export default router;
