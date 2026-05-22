import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import { Notification } from './notification.model';
import { socketHelper } from '../../../helpers/socketHelper';
import { NotificationHelper } from '../../../helpers/notification/notificationHelper';
import { User } from '../user/user.model';
import { logger } from '../../../shared/logger';
import QueryBuilder from '../../builder/QueryBuilder';

/**
 * Send a notification to a user (In-app + Push)
 */
const sendNotification = async (payload: {
  user: string;
  title: string;
  message: string;
  type: 'CONSULTATION_STATUS' | 'PAYMENT_SUCCESS' | 'CONSULTATION_REMINDER' | 'SYSTEM';
  relatedBooking?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    // 1. Save to Database
    const notification = await Notification.create({
      ...payload,
      read: false,
    });

    // 2. Real-time In-app notification via Socket.io
    socketHelper.emitToUser(payload.user, 'notification', notification);

    // 3. Push Notification via FCM
    const targetUser = await User.findById(payload.user);
    if (targetUser && targetUser.fcmTokens && targetUser.fcmTokens.length > 0) {
      const fcmData = {
        title: payload.title,
        body: payload.message,
        type: payload.type,
        relatedBooking: payload.relatedBooking || '',
        ...Object.entries(payload.metadata || {}).reduce(
          (acc, [key, val]) => ({ ...acc, [key]: String(val) }),
          {},
        ),
      };

      const pushResponse = await NotificationHelper.sendPushNotification(
        targetUser.fcmTokens,
        fcmData,
      );

      // Handle invalid tokens
      if (pushResponse && pushResponse.responses) {
        const invalidTokens: string[] = [];
        pushResponse.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const error = resp.error as any;
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(targetUser.fcmTokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await User.findByIdAndUpdate(payload.user, {
            $pull: { fcmTokens: { $in: invalidTokens } },
          });
          logger.info(`Removed ${invalidTokens.length} invalid FCM tokens for user ${payload.user}`);
        }
      }
    }

    return notification;
  } catch (error) {
    logger.error('Error in sendNotification:', error);
    // Do not throw error to avoid crashing the main flow
    return null;
  }
};

const getMyNotifications = async (user: JwtPayload, query: Record<string, any>) => {
  const notificationQuery = new QueryBuilder(
    Notification.find({ user: user.id }),
    query,
  )
    .search(['title', 'message'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.getPaginationInfo();

  return { result, meta };
};

const markAsRead = async (user: JwtPayload, notificationId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: user.id },
    { read: true },
    { new: true },
  );

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  return notification;
};

const markAllAsRead = async (user: JwtPayload) => {
  await Notification.updateMany({ user: user.id, read: false }, { read: true });
  return { message: 'All notifications marked as read' };
};

const getUnreadCount = async (user: JwtPayload) => {
  const count = await Notification.countDocuments({
    user: user.id,
    read: false,
  });
  return { count };
};

export const NotificationService = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
