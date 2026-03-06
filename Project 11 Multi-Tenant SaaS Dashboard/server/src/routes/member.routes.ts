import { Router } from 'express';
import * as member from '../controllers/member.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

// mergeParams gives this router access to :workspaceId from the mount path.
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', requireRole('ADMIN', 'USER', 'VIEWER'), member.list);
router.post('/', requireRole('ADMIN'), member.invite);
router.patch('/:memberId', requireRole('ADMIN'), member.updateRole);
router.delete('/:memberId', requireRole('ADMIN'), member.remove);

export default router;
