/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ConsultationService } from './consultation.service';
import { ParsedQs } from 'qs';

const setAvailability = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await ConsultationService.setAvailability(
    user,
    req.body.slots,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Availability set successfully',
    data: result,
  });
});

const getAvailableSlots = catchAsync(async (req: Request, res: Response) => {
  const { consultantId } = req.params;
  const { date } = req.query;
  const result = await ConsultationService.getAvailableSlots(
    consultantId,
    date as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Available slots retrieved successfully',
    data: result,
  });
});

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await ConsultationService.createBooking(user, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Consultation booked successfully',
    data: result,
  });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await ConsultationService.getMyBookings(user, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bookings retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;
  const result = await ConsultationService.updateBookingStatus(
    user,
    id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Booking status updated successfully',
    data: result,
  });
});

const rescheduleBooking = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;
  const result = await ConsultationService.rescheduleBooking(
    user,
    id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      'Booking rescheduled successfully. Waiting for consultant approval.',
    data: result,
  });
});

export const ConsultationController = {
  setAvailability,
  getAvailableSlots,
  createBooking,
  getMyBookings,
  updateBookingStatus,
  rescheduleBooking,
};
