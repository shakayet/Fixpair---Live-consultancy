/* eslint-disable no-console */
/* eslint-disable no-undef */
import admin from 'firebase-admin';
import config from '../../config';
import { logger, errorLogger } from '../../shared/logger';

let isFcmInitialized = false;

try {
  if (config.fcm.serviceAccountBase64) {
    // Decoded service account from base64 string in .env
    const decodedServiceAccount = Buffer.from(
      config.fcm.serviceAccountBase64,
      'base64',
    ).toString('utf-8');

    const serviceAccount = JSON.parse(decodedServiceAccount);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    isFcmInitialized = true;
    logger.info('✓ Firebase Admin initialized successfully');
  } else {
    logger.warn('! Firebase Service Account Base64 is missing in .env');
  }
} catch (error) {
  errorLogger.error('Failed to initialize Firebase Admin:', error);
  logger.warn(
    '! FCM features will be disabled. Check your FCM_SERVICE_ACCOUNT_BASE64 in .env',
  );
}

const sendPushNotification = async (
  token: string,
  data: Record<string, string>,
) => {
  if (!isFcmInitialized) {
    logger.warn('Skipping push notification: Firebase Admin not initialized');
    return null;
  }

  const message: admin.messaging.Message = {
    token,
    data,
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
        },
      },
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'background',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    errorLogger.error('Error sending FCM message:', error);
    throw error;
  }
};

export const NotificationHelper = {
  sendPushNotification,
};
