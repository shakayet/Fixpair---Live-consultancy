/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StripeService } from './stripe.service';
import { User } from '../user/user.model';
import { Transaction } from './payment.model';
import { Consultation } from '../consultation/consultation.model';
import { BillingService } from './billing.service';
import { NotificationService } from '../notification/notification.service';
import ApiError from '../../../errors/ApiError';
import config from '../../../config';
import { logger } from '../../../shared/logger';

const createStripeCustomer = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const userData = await User.findById(user.id);
  if (!userData) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

  if (userData.stripeCustomerId) {
    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Customer already exists',
      data: { stripeCustomerId: userData.stripeCustomerId },
    });
  }

  const customer = await StripeService.createCustomer(
    userData.email,
    userData.name,
  );
  userData.stripeCustomerId = customer.id;
  await userData.save();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Stripe customer created successfully',
    data: { stripeCustomerId: customer.id },
  });
});

const attachPaymentMethod = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { paymentMethodId } = req.body;

  const userData = await User.findById(user.id);
  if (!userData || !userData.stripeCustomerId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User must be a Stripe customer first',
    );
  }

  // Check if this payment method is already in our DB for this user
  const existingMethod = userData.paymentMethods?.find(
    m => m.methodId === paymentMethodId,
  );

  try {
    // 1. Retrieve the payment method to check its status
    const method =
      await StripeService.stripe.paymentMethods.retrieve(paymentMethodId);

    // 2. If it's not already attached to this customer, attach it
    if (method.customer !== userData.stripeCustomerId) {
      await StripeService.attachPaymentMethod(
        userData.stripeCustomerId,
        paymentMethodId,
      );
    }

    // 3. Update our database if it doesn't exist yet
    if (!existingMethod) {
      const methodData = {
        provider: 'stripe' as const,
        methodId: paymentMethodId,
        last4: method.card?.last4,
        brand: method.card?.brand,
        isDefault: (userData.paymentMethods?.length || 0) === 0,
      };

      await User.findByIdAndUpdate(user.id, {
        $push: { paymentMethods: methodData },
      });

      return sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Payment method attached successfully',
        data: methodData,
      });
    }

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Payment method already attached',
      data: existingMethod,
    });
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Stripe Error: ${error.message}`,
    );
  }
});

const setDefaultPaymentMethod = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'paymentMethodId is required',
      );
    }

    const userData = await User.findById(user.id);
    if (!userData) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

    const methodExists = userData.paymentMethods?.some(
      m => m.methodId === paymentMethodId,
    );
    if (!methodExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment method not found');
    }

    userData.paymentMethods?.forEach(m => {
      m.isDefault = m.methodId === paymentMethodId;
    });
    await userData.save();

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Default payment method updated successfully',
      data: userData.paymentMethods,
    });
  },
);

const getPaymentMethods = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const userData = await User.findById(user.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment methods retrieved successfully',
    data: userData?.paymentMethods || [],
  });
});

const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = config.payment.stripe.webhookSecret;

  let event;

  try {
    event = StripeService.stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret,
    );
  } catch (err: any) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Webhook Error: ${err.message}`,
    );
  }

  // Handle specific events
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      const consultationId = intent.metadata.consultationId;

      // Find the transaction first to check current status
      let existingTransaction = await Transaction.findOne({
        transactionId: intent.id,
      });

      // If it doesn't exist (e.g. manual payment from Stripe Dashboard), create it
      if (!existingTransaction) {
        const userId = intent.metadata.userId;
        if (!userId) {
          logger.warn(
            `Webhook received for intent ${intent.id} without userId in metadata`,
          );
          break;
        }

        existingTransaction = await Transaction.create({
          consultation: consultationId,
          user: userId,
          transactionId: intent.id,
          amount: intent.amount / 100,
          provider: 'stripe',
          status: 'pending',
          type: 'charge',
        });
      }

      // If transaction is not already captured, mark it as captured
      if (existingTransaction.status !== 'captured') {
        existingTransaction.status = 'captured';
        await existingTransaction.save();
      }

      // Send notification using idempotencyKey to prevent duplicates.
      // We send this here as a fallback/confirmation. If billing.service already sent it, 
      // the NotificationService will block this duplicate.
      await NotificationService.sendNotification({
        user: existingTransaction.user.toString(),
        title: 'Payment Successful',
        message: `Your payment of $${(intent.amount / 100).toFixed(2)} has been completed successfully.`,
        type: 'PAYMENT_SUCCESS',
        relatedBooking: consultationId,
        idempotencyKey: `payment_success_${intent.id}`,
        metadata: {
          amount: intent.amount / 100,
          status: 'captured',
          transactionId: intent.id,
        },
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      const consultationId = intent.metadata.consultationId;

      if (consultationId) {
        // Trigger auto-end if an ongoing billing charge fails
        await BillingService.stopBilling(consultationId);

        await Consultation.findByIdAndUpdate(consultationId, {
          billingStatus: 'failed',
          status: 'cancelled',
        });
      }
      break;
    }
  }

  res.json({ received: true });
});

export const PaymentController = {
  createStripeCustomer,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  getPaymentMethods,
  handleStripeWebhook,
};
