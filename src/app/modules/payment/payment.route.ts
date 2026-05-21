import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentController } from './payment.controller';
import { InvoiceController } from './invoice.controller';
import { PaymentValidation } from './payment.validation';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleStripeWebhook,
);

router.post(
  '/create-customer',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT),
  PaymentController.createStripeCustomer,
);

router.post(
  '/attach-method',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT),
  PaymentController.attachPaymentMethod,
);

router.get(
  '/methods',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT),
  PaymentController.getPaymentMethods,
);

// Invoice routes
router.get(
  '/invoice/:consultationId',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  validateRequest(PaymentValidation.getInvoiceZodSchema),
  InvoiceController.getInvoiceData,
);

router.get(
  '/invoice/pdf/:consultationId',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  validateRequest(PaymentValidation.getInvoiceZodSchema),
  InvoiceController.downloadInvoicePDF,
);

export const PaymentRoutes = router;
