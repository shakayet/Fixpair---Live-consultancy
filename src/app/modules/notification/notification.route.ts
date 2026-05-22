import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { NotificationController } from './notification.controller';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.getMyNotifications
);

router.get(
  '/unread-count',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.getUnreadCount
);

router.patch(
  '/mark-all-read',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.markAllAsRead
);

router.patch(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.markAsRead
);

export const NotificationRoutes = router;
