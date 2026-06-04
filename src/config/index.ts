/* eslint-disable no-undef */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  ip_address: process.env.IP_ADDRESS,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  branding: {
    projectName: process.env.PROJECT_NAME,
    logoUrl: process.env.BRAND_LOGO,
  },
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRE_IN,
  },
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  super_admin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
  agora: {
    appId: process.env.AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
    customerId: process.env.AGORA_CUSTOMER_ID || '',
    customerSecret: process.env.AGORA_CUSTOMER_SECRET || '',
    expirationTime: Number(process.env.AGORA_TOKEN_EXPIRATION_TIME) || 3600,
  },
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      currency: process.env.STRIPE_CURRENCY || 'usd',
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
    },
    billing: {
      platformFee: Number(process.env.PLATFORM_FIXED_FEE) || 5,
      minMinutes: Number(process.env.MINIMUM_CONSULTATION_MINUTES) || 1,
      retryAttempts: Number(process.env.PAYMENT_RETRY_ATTEMPTS) || 3,
      retryDelay: Number(process.env.PAYMENT_RETRY_DELAY_SECONDS) || 30,
      warningMinutes: Number(process.env.CONSULTATION_WARNING_MINUTES) || 5,
    },
  },
  fcm: {
    serviceAccountBase64: process.env.FCM_SERVICE_ACCOUNT_BASE64 || '',
  },
};
