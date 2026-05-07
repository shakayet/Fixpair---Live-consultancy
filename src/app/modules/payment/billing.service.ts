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

  // Initialize consultation billing state
  consultation.billingStatus = 'charging';
  consultation.platformFee = platformFee;
  consultation.perMinuteRate = perMinuteRate;
  consultation.consumedAmount = 0; // Start at 0, charged in attemptMinuteCharge
  await consultation.save();

  // Start per-minute timer first to ensure sessionData is available
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
  });

  // Initial charge for platform fee + 1st minute
  await attemptMinuteCharge(consultationId, true);
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

    // Update consultation
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

    // Handle retry logic or terminate
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

const stopBilling = (consultationId: string) => {
  const sessionData = activeSessions.get(consultationId);
  if (sessionData) {
    clearInterval(sessionData.timer);
    activeSessions.delete(consultationId);
  }
};

export const BillingService = {
  startBilling,
  stopBilling,
};
