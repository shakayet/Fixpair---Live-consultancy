import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CustomerSupportController } from './customerSupport.controller';
import { CustomerSupportValidation } from './customerSupport.validation';

const router = express.Router();

router.post(
  '/create-update',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(CustomerSupportValidation.createOrUpdateCustomerSupportZodSchema),
  CustomerSupportController.createOrUpdateCustomerSupport,
);

router.get(
  '/',
  CustomerSupportController.getCustomerSupport,
);

export const CustomerSupportRoutes = router;
