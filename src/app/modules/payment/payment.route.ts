import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { PaymentController } from './payment.controller';

const router = express.Router();

router.post(
  '/create-customer',
  auth(USER_ROLES.USER),
  PaymentController.createStripeCustomer
);

router.post(
  '/attach-method',
  auth(USER_ROLES.USER),
  PaymentController.attachPaymentMethod
);

router.get(
  '/methods',
  auth(USER_ROLES.USER),
  PaymentController.getPaymentMethods
);

export const PaymentRoutes = router;
