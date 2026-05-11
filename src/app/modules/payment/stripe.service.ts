/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import Stripe from 'stripe';
import config from '../../../config';

const stripe = new Stripe(config.payment.stripe.secretKey, {
  apiVersion: '2024-04-10' as any,
});

/**
 * Stripe Service
 * Handles customer management, payment methods, and transactions
 */

const createCustomer = async (email: string, name: string) => {
  return await stripe.customers.create({ email, name });
};

const attachPaymentMethod = async (customerId: string, paymentMethodId: string) => {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  return await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
};

const listCustomerPaymentMethods = async (customerId: string) => {
  return await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
};

const createCharge = async (
  customerId: string,
  paymentMethodId: string,
  amount: number,
  consultationId: string,
) => {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // convert to cents
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata: { consultationId },
  });
};

/**
 * Authorizes a payment for future capture (Pre-auth)
 * Used for the 5-minute affordability check at session start
 */
const authorizePayment = async (
  customerId: string,
  paymentMethodId: string,
  amount: number,
  consultationId: string
) => {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    capture_method: 'manual', // This makes it an authorization
    metadata: { consultationId },
  });
};

/**
 * Captures a previously authorized payment
 */
const capturePayment = async (
  paymentIntentId: string,
  amount: number
) => {
  return await stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: Math.round(amount * 100),
  });
};

/**
 * Voids a previously authorized payment (cancels the hold)
 */
const voidAuthorization = async (paymentIntentId: string) => {
  return await stripe.paymentIntents.cancel(paymentIntentId);
};

export const StripeService = {
  stripe,
  createCustomer,
  attachPaymentMethod,
  createCharge,
  authorizePayment,
  capturePayment,
  voidAuthorization
};
