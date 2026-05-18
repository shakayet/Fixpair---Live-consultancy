import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { VideoSessionController } from './videoSession.controller';
import { VideoSessionValidation } from './videoSession.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.USER, USER_ROLES.CONSULTANT),
    validateRequest(VideoSessionValidation.createSessionZodSchema),
    VideoSessionController.createSession,
  )
  .get(
    auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VideoSessionController.getMySessions,
  );

router.post(
  '/join',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT),
  validateRequest(VideoSessionValidation.joinSessionZodSchema),
  VideoSessionController.joinSession,
);

router.post(
  '/end',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT),
  validateRequest(VideoSessionValidation.endSessionZodSchema),
  VideoSessionController.endSession,
);

router.post(
  '/action',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT),
  validateRequest(VideoSessionValidation.callActionZodSchema),
  VideoSessionController.handleCallAction,
);

export const VideoSessionRoutes = router;
