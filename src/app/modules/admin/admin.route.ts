import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { AdminController } from './admin.controller';

const router = express.Router();

router.get(
  '/dashboard-summary',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getDashboardSummary,
);

router.get(
  '/active-consultations',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getActiveConsultations,
);

router.get(
  '/revenue-summary',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getRevenueSummary,
);

router.get(
  '/transactions',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getAllTransactions,
);

router.get(
  '/revenue-trend',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getRevenueTrend,
);

router.get(
  '/monitor',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getSystemMonitor,
);

export const AdminRoutes = router;
