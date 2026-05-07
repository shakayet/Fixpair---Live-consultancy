import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PrivacyController } from './privacy.controller';
import { PrivacyValidation } from './privacy.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(PrivacyValidation.createPrivacyZodSchema),
    PrivacyController.createPrivacy,
  )
  .get(PrivacyController.getAllPrivacies);

router
  .route('/:id')
  .get(PrivacyController.getSinglePrivacy)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(PrivacyValidation.updatePrivacyZodSchema),
    PrivacyController.updatePrivacy,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PrivacyController.deletePrivacy,
  );

export const PrivacyRoutes = router;
