import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NotificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await NotificationService.getMyNotifications(user, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notifications retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;
  const result = await NotificationService.markAsRead(user, id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await NotificationService.markAllAsRead(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: null,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await NotificationService.getUnreadCount(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Unread notification count retrieved successfully',
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
