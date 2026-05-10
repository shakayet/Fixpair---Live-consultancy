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
import ApiError from '../../../errors/ApiError';
import config from '../../../config';

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

  await StripeService.attachPaymentMethod(
    userData.stripeCustomerId,
    paymentMethodId,
  );

  // Get method details to store last4/brand
  const method =
    await StripeService.stripe.paymentMethods.retrieve(paymentMethodId);

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

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment method attached successfully',
    data: methodData,
  });
});

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

      // Update transaction status if it exists
      await Transaction.findOneAndUpdate(
        { transactionId: intent.id },
        { status: 'captured' },
      );
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
  getPaymentMethods,
  handleStripeWebhook,
};
