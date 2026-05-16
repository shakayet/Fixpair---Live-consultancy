# Payment Integration Guide (Stripe)

This guide provides the necessary steps for mobile app developers to integrate the Stripe payment flow into the application.

## Overview

The payment system follows a **Setup-First** approach. Users must add a payment method to their profile before they can book a consultation. The backend uses Stripe's "Off-Session" payments, allowing the server to charge the user automatically based on the consultation duration.

### Payment Flow

1. **Create Customer**: The app ensures the user has a Stripe Customer ID.
2. **Collect Card Info**: The app uses the Stripe SDK to securely collect card details and generate a `PaymentMethodId`.
3. **Attach Method**: The app sends the `PaymentMethodId` to the backend to link it to the user's profile.
4. **Automated Billing**: Once a method is attached, the backend handles all charges automatically during/after consultations.

---

## 1. Setup

### Mobile SDKs

- **Flutter**: [flutter_stripe](https://pub.dev/packages/flutter_stripe)
- **iOS/Android**: Official Stripe SDKs

Configure the Stripe SDK with your **Publishable Key** (provided by the admin).

---

## 2. API Implementation

### Step 1: Create Stripe Customer

Before adding a card, the user must be registered as a customer in Stripe.

**Endpoint**: `POST /api/v1/payment/create-customer`  
**Headers**: `Authorization: Bearer <token>`  
**Response**:

```json
{
  "success": true,
  "data": { "stripeCustomerId": "cus_..." }
}
```

---

### Step 2: Collect Payment Method (Client-Side)

Use the Stripe SDK's **CardField** or **PaymentSheet** to collect card information. **Never send raw card numbers to the backend.**

**Flutter Example (using flutter_stripe):**

```dart
// 1. Create payment method on Stripe servers
const paymentMethod = await Stripe.instance.createPaymentMethod(
  params: const PaymentMethodParams.card(
    paymentMethodData: PaymentMethodData(),
  ),
);

// 2. Send the resulting ID to our backend
final paymentMethodId = paymentMethod.id; // e.g., "pm_..."
```

---

### Step 3: Attach Payment Method to Backend

Send the generated `paymentMethodId` to the backend to store it for future consultations.

**Endpoint**: `POST /api/v1/payment/attach-method`  
**Headers**: `Authorization: Bearer <token>`  
**Body**:

```json
{
  "paymentMethodId": "pm_..."
}
```

---

### Step 4: Manage Payment Methods

You can retrieve the list of saved cards to show the user which card is currently active.

**Endpoint**: `GET /api/v1/payment/methods`  
**Response**:

```json
{
  "success": true,
  "data": [
    {
      "provider": "stripe",
      "methodId": "pm_...",
      "last4": "4242",
      "brand": "visa",
      "isDefault": true
    }
  ]
}
```

---

## 3. How Billing Works (For Reference)

The backend handles billing in two phases:

1. **Pre-Authorization**: At the start of a session, a hold is placed on the user's card (usually for 5 minutes of consultation time) to ensure they can afford the start of the call.
2. **Capture & Increment**: As the session continues, the backend captures the held amount and initiates new charges automatically.

**Note**: If a payment fails during an active session, the backend will automatically terminate the video call and notify the user.

---

## 4. Troubleshooting

- **"User must be a Stripe customer first"**: Always call `/create-customer` before attempting to attach a card.
- **Card Declined**: This is usually a Stripe-level error. Ensure the user has sufficient funds or a valid card.
- **Webhooks**: The backend uses webhooks to track payment status. If a payment is successful but the UI doesn't update, check the `payment_intent.succeeded` event processing in the backend.
