import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { AgoraController } from './agora.controller';

const router = express.Router();

router.get(
  '/token',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN),
  AgoraController.getToken,
);

export const AgoraRoutes = router;
