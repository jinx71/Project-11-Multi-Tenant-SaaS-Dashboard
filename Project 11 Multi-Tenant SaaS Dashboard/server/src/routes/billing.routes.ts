import { Router } from 'express';
import { createCheckoutSession, createPortalSession } from '../controllers/billing.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Only workspace admins can spend the workspace's money.
router.post('/checkout', requireRole('ADMIN'), createCheckoutSession);
router.post('/portal', requireRole('ADMIN'), createPortalSession);

export default router;
