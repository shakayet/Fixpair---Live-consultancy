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

/**
 * Pre-authorize an amount (Authorize but not capture)
 */
const authorizePayment = async (
  customerId: string,
  paymentMethodId: string,
  amount: number,
  consultationId: string
) => {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe expects cents
    currency: config.payment.stripe.currency,
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: 'manual',
    confirm: true,
    setup_future_usage: 'off_session',
    metadata: { consultationId },
    // For automatic payment methods like Apple/Google Pay
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  });
};

/**
 * Capture a previously authorized payment
 */
const capturePayment = async (paymentIntentId: string, amount: number) => {
  return await stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: Math.round(amount * 100),
  });
};

/**
 * Direct charge (for per-minute strategy)
 */
const createCharge = async (
  customerId: string,
  paymentMethodId: string,
  amount: number,
  consultationId: string
) => {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: config.payment.stripe.currency,
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata: { consultationId },
  });
};

const voidAuthorization = async (paymentIntentId: string) => {
  return await stripe.paymentIntents.cancel(paymentIntentId);
};

export const StripeService = {
  createCustomer,
  attachPaymentMethod,
  listCustomerPaymentMethods,
  authorizePayment,
  capturePayment,
  createCharge,
  voidAuthorization,
  stripe, // Export raw instance for webhooks
};
