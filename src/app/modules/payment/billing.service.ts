/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Consultation } from '../consultation/consultation.model';
import { StripeService } from './stripe.service';
import { PayPalService } from './paypal.service';
import { Transaction } from './payment.model';
import config from '../../../config';
import { socketHelper } from '../../../helpers/socketHelper';

/**
 * Billing Engine
 * Tracks active consultations and charges per minute
 */

// In-memory tracker for active sessions (for horizontal scaling, move this to Redis)
const activeSessions = new Map<
  string,
  {
    startTime: number;
    lastChargeTime: number;
    userId: string;
    consultantId: string;
    perMinuteRate: number;
    paymentMethodId: string;
    provider: 'stripe' | 'paypal';
    timer: NodeJS.Timeout;
    preAuthIntentId?: string;
  }
>();

const startBilling = async (consultationId: string) => {
  const consultation =
    await Consultation.findById(consultationId).populate('user consultant');
  if (!consultation)
    throw new ApiError(StatusCodes.NOT_FOUND, 'Consultation not found');

  const user = await User.findById(consultation.user);
  const consultant = await User.findById(consultation.consultant);

  if (!user || !consultant)
    throw new ApiError(StatusCodes.NOT_FOUND, 'Participants not found');

  if (!user.stripeCustomerId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User must have a Stripe account',
    );
  }

  // Find default payment method
  const defaultMethod =
    user.paymentMethods?.find(m => m.isDefault) || user.paymentMethods?.[0];
  if (!defaultMethod)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No default payment method found',
    );

  const perMinuteRate = consultant.perMinuteRate || 0;
  const platformFee = config.payment.billing.platformFee;
  const minMinutes = 5; // Business requirement: afford at least 5 minutes
  const preAuthAmount = platformFee + perMinuteRate * minMinutes;

  // 1. Pre-authorize the amount (affordability check)
  let preAuthIntent;
  try {
    // In real production, we would use the actual method ID.
    // For local testing with pm_card_visa, we'll bypass the Stripe call if it's a test token
    if (defaultMethod.methodId === 'pm_card_visa') {
      console.log('Test token detected, simulating pre-auth success');
      preAuthIntent = { id: 'pi_test_' + Date.now() };
    } else {
      preAuthIntent = await StripeService.authorizePayment(
        user.stripeCustomerId,
        defaultMethod.methodId,
        preAuthAmount,
        consultationId,
      );
    }
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.PAYMENT_REQUIRED,
      `Insufficient funds or card error: ${error.message}`,
    );
  }

  // Initialize consultation billing state
  consultation.billingStatus = 'charging';
  consultation.platformFee = platformFee;
  consultation.perMinuteRate = perMinuteRate;
  consultation.consumedAmount = 0;
  await consultation.save();

  // Start per-minute timer
  const timer = setInterval(async () => {
    await attemptMinuteCharge(consultationId);
  }, 60000); // 1 minute

  activeSessions.set(consultationId, {
    startTime: Date.now(),
    lastChargeTime: Date.now(),
    userId: user._id.toString(),
    consultantId: consultant._id.toString(),
    perMinuteRate,
    paymentMethodId: defaultMethod.methodId,
    provider: defaultMethod.provider,
    timer,
    preAuthIntentId: preAuthIntent.id,
  });

  // Initial charge for platform fee + 1st minute (captured from pre-auth)
  await attemptMinuteCharge(consultationId, true);
};

/**
 * Recovers billing for ongoing consultations after server restart
 */
const recoverBilling = async () => {
  console.log('--- RECOVERING BILLING SESSIONS ---');
  const ongoingConsultations = await Consultation.find({
    status: 'completed', // Only consultations that should be active
    billingStatus: 'charging',
  });

  for (const consultation of ongoingConsultations) {
    if (!activeSessions.has(consultation._id.toString())) {
      console.log(`Resuming billing for consultation: ${consultation._id}`);
      // Since pre-auth was likely released or captured, we just resume per-minute charging
      const timer = setInterval(async () => {
        await attemptMinuteCharge(consultation._id.toString());
      }, 60000);

      const user = await User.findById(consultation.user);
      const defaultMethod =
        user?.paymentMethods?.find(m => m.isDefault) ||
        user?.paymentMethods?.[0];

      if (user && defaultMethod) {
        activeSessions.set(consultation._id.toString(), {
          startTime: (consultation as any).createdAt.getTime(),
          lastChargeTime: Date.now(),
          userId: user._id.toString(),
          consultantId: consultation.consultant.toString(),
          perMinuteRate: consultation.perMinuteRate,
          paymentMethodId: defaultMethod.methodId,
          provider: defaultMethod.provider,
          timer,
        });
      }
    }
  }
  console.log(
    `--- RECOVERY COMPLETE: ${ongoingConsultations.length} SESSIONS CHECKED ---`,
  );
};

const attemptMinuteCharge = async (
  consultationId: string,
  isInitial: boolean = false,
) => {
  const sessionData = activeSessions.get(consultationId);
  if (!sessionData) return;

  const consultation =
    await Consultation.findById(consultationId).populate('user');
  if (!consultation) return;

  const chargeAmount = isInitial
    ? consultation.platformFee + consultation.perMinuteRate
    : consultation.perMinuteRate;

  try {
    let transaction;
    if (sessionData.provider === 'stripe') {
      if (
        isInitial &&
        sessionData.preAuthIntentId &&
        !sessionData.preAuthIntentId.startsWith('pi_test_')
      ) {
        // Capture part of the pre-authorized amount for the first minute
        const capture = await StripeService.capturePayment(
          sessionData.preAuthIntentId,
          chargeAmount,
        );

        transaction = await Transaction.create({
          consultation: consultationId,
          user: (consultation.user as any)._id,
          consultant: consultation.consultant,
          provider: 'stripe',
          transactionId: capture.id,
          amount: chargeAmount,
          status: 'captured',
          type: 'charge',
        });
      } else if (sessionData.preAuthIntentId?.startsWith('pi_test_')) {
        // Simulate test transaction
        transaction = await Transaction.create({
          consultation: consultationId,
          user: (consultation.user as any)._id,
          consultant: consultation.consultant,
          provider: 'stripe',
          transactionId: 'txn_test_' + Date.now(),
          amount: chargeAmount,
          status: 'captured',
          type: 'charge',
        });
      } else {
        // Subsequent per-minute direct charges
        const paymentIntent = await StripeService.createCharge(
          (consultation.user as any).stripeCustomerId,
          sessionData.paymentMethodId,
          chargeAmount,
          consultationId,
        );

        transaction = await Transaction.create({
          consultation: consultationId,
          user: (consultation.user as any)._id,
          consultant: consultation.consultant,
          provider: 'stripe',
          transactionId: paymentIntent.id,
          amount: chargeAmount,
          status: 'captured',
          type: 'charge',
        });
      }
    }

    // Update consultation.........
    consultation.consumedAmount += chargeAmount;
    consultation.paymentStatus = 'paid';
    await consultation.save();

    // Emit socket update
    socketHelper.emitToUser(
      consultation.user._id.toString(),
      'billing-updated',
      {
        consultationId,
        consumedAmount: consultation.consumedAmount,
        status: 'success',
      },
    );
  } catch (error) {
    console.error(`Billing failed for ${consultationId}:`, error);
    await handlePaymentFailure(consultationId);
  }
};

const handlePaymentFailure = async (consultationId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) return;

  consultation.billingStatus = 'failed';
  consultation.terminationReason = 'insufficient_funds';
  consultation.status = 'cancelled';
  await consultation.save();

  // Void any remaining authorization
  const sessionData = activeSessions.get(consultationId);
  if (sessionData?.preAuthIntentId) {
    await StripeService.voidAuthorization(sessionData.preAuthIntentId).catch(
      console.error,
    );
  }

  // Stop timer and notify
  stopBilling(consultationId);

  socketHelper.emitToUser(
    consultation.user.toString(),
    'consultation-auto-ended',
    {
      consultationId,
      reason: 'Payment failed',
    },
  );
};

const stopBilling = async (consultationId: string) => {
  const sessionData = activeSessions.get(consultationId);
  if (sessionData) {
    clearInterval(sessionData.timer);

    // Void any remaining authorization when session ends normally
    if (
      sessionData.preAuthIntentId &&
      !sessionData.preAuthIntentId.startsWith('pi_test_')
    ) {
      await StripeService.voidAuthorization(sessionData.preAuthIntentId).catch(
        console.error,
      );
    }

    activeSessions.delete(consultationId);
  }
};

export const BillingService = {
  startBilling,
  stopBilling,
  recoverBilling,
};
