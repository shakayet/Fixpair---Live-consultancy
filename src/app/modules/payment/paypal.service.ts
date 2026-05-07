import paypal from '@paypal/checkout-server-sdk';
import config from '../../../config';

/**
 * PayPal SDK Configuration
 */
const environment =
  config.payment.paypal.environment === 'live'
    ? new paypal.core.LiveEnvironment(
        config.payment.paypal.clientId,
        config.payment.paypal.clientSecret,
      )
    : new paypal.core.SandboxEnvironment(
        config.payment.paypal.clientId,
        config.payment.paypal.clientSecret,
      );

const client = new paypal.core.PayPalHttpClient(environment);

/**
 * PayPal Service
 * Handles authorization and capture flows
 */

const authorizePayment = async (amount: number, consultationId: string) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: consultationId,
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2),
        },
      },
    ],
  });

  const order = await client.execute(request);
  return order.result;
};

const capturePayment = async (authorizationId: string, amount: number) => {
  const request = new paypal.payments.AuthorizationsCaptureRequest(
    authorizationId,
  );
  request.requestBody({
    amount: {
      currency_code: 'USD',
      value: amount.toFixed(2),
    },
    final_capture: true,
    invoice_id: `INV-${Date.now()}`,
    note_to_payer: 'Consultation payment',
    soft_descriptor: 'FixPair',
  });

  const response = await client.execute(request);
  return response.result;
};

const voidAuthorization = async (authorizationId: string) => {
  const request = new paypal.payments.AuthorizationsVoidRequest(
    authorizationId,
  );
  const response = await client.execute(request);
  return response.result;
};

export const PayPalService = {
  authorizePayment,
  capturePayment,
  voidAuthorization,
  client,
};
