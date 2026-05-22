/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Availability, Consultation } from './consultation.model';
import { ISlot } from './consultation.interface';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import config from '../../../config';
import { NotificationService } from '../notification/notification.service';

const setAvailability = async (user: JwtPayload, slots: ISlot[]) => {
  const consultantId = user.id;

  // 1. Validate slots are within the next 30 days
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  slots.forEach(slot => {
    const slotDate = new Date(slot.date);
    if (slotDate < now || slotDate > thirtyDaysLater) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Unavailable slots must be within the next 30 days',
      );
    }
  });

  // 2. Upsert availability (Unavailable slots)
  const result = await Availability.findOneAndUpdate(
    { consultant: consultantId },
    {
      $set: {
        consultant: consultantId,
        slots: slots.map(s => ({
          date: new Date(s.date),
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      },
    },
    { upsert: true, new: true },
  );

  return result;
};

const getAvailableSlots = async (consultantId: string, date?: string) => {
  // 1. Find the unavailable slots for the consultant
  const availability = await Availability.findOne({ consultant: consultantId });
  const unavailableSlots = availability ? availability.slots : [];

  // 2. Find already booked slots (accepted, confirmed, completed)
  const filter: any = {
    consultant: new mongoose.Types.ObjectId(consultantId),
    status: { $in: ['accepted', 'confirmed', 'completed', 'pending'] },
    bookingType: 'scheduled',
  };

  if (date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    filter.date = { $gte: targetDate, $lt: nextDay };
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filter.date = { $gte: today };
  }

  const bookedConsultations = await Consultation.find(filter).select(
    'date startTime endTime',
  );

  return {
    unavailableSlots: unavailableSlots.map(s => ({
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    bookedSlots: bookedConsultations.map(c => ({
      date: c.date,
      startTime: c.startTime,
      endTime: c.endTime,
    })),
  };
};

const createBooking = async (
  user: JwtPayload,
  payload: {
    consultantId: string;
    bookingType: 'scheduled' | 'instant' | 'callback';
    date?: string;
    startTime?: string;
    endTime?: string;
    preferredWindow?: 'asap' | 'today' | 'tomorrow';
    notes?: string;
  },
) => {
  const {
    consultantId,
    bookingType,
    date,
    startTime,
    endTime,
    preferredWindow,
    notes,
  } = payload;
  const userId = user.id;

  // 0. Validate if consultantId is a valid consultant
  const consultant = await User.findById(consultantId);
  if (!consultant || consultant.role !== USER_ROLES.CONSULTANT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid consultant ID');
  }

  const perMinuteRate = consultant.perMinuteRate || 0;
  const platformFee = config.payment.billing.platformFee;

  if (bookingType === 'scheduled') {
    if (!date || !startTime || !endTime) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Date, startTime, and endTime are required for scheduled booking',
      );
    }

    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);

    // 1. Check if slot is marked as UNAVAILABLE by consultant
    const availability = await Availability.findOne({
      consultant: new mongoose.Types.ObjectId(consultantId),
      slots: {
        $elemMatch: {
          date: slotDate,
          startTime: startTime,
          endTime: endTime,
        },
      },
    });

    if (availability) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This slot is marked unavailable by the consultant',
      );
    }

    // 2. Check if slot is ALREADY BOOKED
    const existingBooking = await Consultation.findOne({
      consultant: new mongoose.Types.ObjectId(consultantId),
      date: slotDate,
      startTime: startTime,
      endTime: endTime,
      status: {
        $in: ['pending', 'accepted', 'confirmed', 'completed'],
      },
    });

    if (existingBooking) {
      throw new ApiError(StatusCodes.CONFLICT, 'This slot is already booked');
    }

    // 3. Validate 30-day window
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    if (slotDate < now && slotDate.toDateString() !== now.toDateString()) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Booking date cannot be in the past',
      );
    }

    if (slotDate > thirtyDaysLater) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Booking must be within the next 30 days',
      );
    }

    // 4. Create the consultation record
    const consultationData: any = {
      user: new mongoose.Types.ObjectId(userId),
      consultant: new mongoose.Types.ObjectId(consultantId),
      bookingType: 'scheduled',
      date: slotDate,
      startTime: startTime,
      endTime: endTime,
      status: 'pending',
      paymentStatus: 'pending',
      perMinuteRate,
      platformFee,
    };
    if (notes) consultationData.notes = notes;

    const result = await Consultation.create(consultationData);
    return result;
  } else if (bookingType === 'instant') {
    // Instant booking: starts as pending
    const instantBookingData: any = {
      user: new mongoose.Types.ObjectId(userId),
      consultant: new mongoose.Types.ObjectId(consultantId),
      bookingType: 'instant',
      status: 'pending',
      paymentStatus: 'pending',
      perMinuteRate,
      platformFee,
    };
    if (notes) instantBookingData.notes = notes;

    const result = await Consultation.create(instantBookingData);
    return result;
  } else if (bookingType === 'callback') {
    if (!preferredWindow) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Preferred window is required for callback request',
      );
    }

    // Callback request: starts as pending
    const callbackBookingData: any = {
      user: new mongoose.Types.ObjectId(userId),
      consultant: new mongoose.Types.ObjectId(consultantId),
      bookingType: 'callback',
      preferredWindow,
      status: 'pending',
      paymentStatus: 'pending',
      perMinuteRate,
      platformFee,
    };
    if (notes) callbackBookingData.notes = notes;

    const result = await Consultation.create(callbackBookingData);
    return result;
  }
};

const getMyBookings = async (
  user: JwtPayload,
  query: Record<string, unknown>,
) => {
  const filter: Record<string, any> = {};
  if (user.role === 'USER') {
    filter.user = new mongoose.Types.ObjectId(user.id);
  } else if (user.role === 'CONSULTANT') {
    filter.consultant = new mongoose.Types.ObjectId(user.id);
  }

  const bookingQuery = new QueryBuilder(Consultation.find(filter), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  // Ensure user and consultant fields are always selected for population
  bookingQuery.modelQuery.select('user consultant');

  const result = await bookingQuery.modelQuery.populate([
    { path: 'user', select: 'name image avatar email' },
    { path: 'consultant', select: 'name image avatar email tags' },
  ]);
  const meta = await bookingQuery.getPaginationInfo();

  return { result, meta };
};

const updateBookingStatus = async (
  user: JwtPayload,
  bookingId: string,
  payload: {
    status:
      | 'pending'
      | 'accepted'
      | 'rejected'
      | 'confirmed'
      | 'completed'
      | 'cancelled'
      | 'expired';
    date?: string;
    startTime?: string;
    endTime?: string;
  },
) => {
  const { status, date, startTime, endTime } = payload;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Consultation.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
    }

    // Authorization: Only consultant or admin can update status
    if (
      user.role !== 'CONSULTANT' &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You do not have permission to update booking status',
      );
    }

    // Additional logic for callback or instant bookings
    // Map 'accepted' to 'confirmed' as per requirement
    const updateData: any = {
      status: status === 'accepted' ? 'confirmed' : status,
    };
    if (date) updateData.date = new Date(date);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;

    const result = await Consultation.findByIdAndUpdate(bookingId, updateData, {
      new: true,
      session,
    }).populate('consultant');

    if (result && (status === 'accepted' || status === 'rejected')) {
      const consultantName = (result.consultant as any).name;
      const date = result.date
        ? new Date(result.date).toLocaleDateString()
        : '';
      const time = result.startTime || '';

      const message =
        status === 'accepted'
          ? `Your consultation request has been accepted by ${consultantName}.`
          : `Your consultation request has been rejected by ${consultantName}.`;

      await NotificationService.sendNotification({
        user: result.user.toString(),
        title: `Consultation ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
        message,
        type: 'CONSULTATION_STATUS',
        relatedBooking: result._id.toString(),
        metadata: {
          consultantName,
          status: status === 'accepted' ? 'accepted' : 'rejected',
          date,
          time,
        },
      });
    }

    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const rescheduleBooking = async (
  user: JwtPayload,
  bookingId: string,
  payload: { date: string; startTime: string; endTime: string },
) => {
  const { date, startTime, endTime } = payload;
  const userId = user.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the existing booking
    const booking = await Consultation.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
    }

    // Check if user is the owner
    if (booking.user.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized access');
    }

    // 2. Validate booking type
    if (booking.bookingType !== 'scheduled') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Only scheduled bookings can be rescheduled',
      );
    }

    // 3. Validate 6-hour rule
    const [hours, minutes] = booking.startTime!.split(':').map(Number);
    const bookingDateTime = new Date(booking.date!);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    if (bookingDateTime < sixHoursLater) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Rescheduling is only allowed at least 6 hours before the scheduled time',
      );
    }

    const newSlotDate = new Date(date);
    newSlotDate.setHours(0, 0, 0, 0);

    // 4. Check if new slot is UNAVAILABLE
    const availability = await Availability.findOne({
      consultant: booking.consultant,
      slots: {
        $elemMatch: {
          date: newSlotDate,
          startTime: startTime,
          endTime: endTime,
        },
      },
    }).session(session);

    if (availability) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This slot is marked unavailable by the consultant',
      );
    }

    // 5. Check if new slot is ALREADY BOOKED
    const existingBooking = await Consultation.findOne({
      consultant: booking.consultant,
      date: newSlotDate,
      startTime: startTime,
      endTime: endTime,
      status: {
        $in: ['pending', 'accepted', 'confirmed', 'completed'],
      },
      _id: { $ne: booking._id }, // Exclude current booking
    }).session(session);

    if (existingBooking) {
      throw new ApiError(StatusCodes.CONFLICT, 'This slot is already booked');
    }

    // 6. Update the booking record
    booking.date = newSlotDate;
    booking.startTime = startTime;
    booking.endTime = endTime;
    booking.status = 'pending';

    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    return booking;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const cancelBooking = async (
  user: JwtPayload,
  bookingId: string,
  payload: { cancelReason?: string },
) => {
  const { cancelReason } = payload;
  const userId = user.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the booking
    const booking = await Consultation.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
    }

    // 2. Ownership check
    if (booking.user.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Only the booking owner can cancel the consultation',
      );
    }

    // 3. Status check: Prevent cancellation of already completed, rejected, or cancelled bookings
    const nonCancellableStatuses = [
      'completed',
      'rejected',
      'cancelled',
      'expired',
    ];
    if (nonCancellableStatuses.includes(booking.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot cancel a booking that is already ${booking.status}`,
      );
    }

    // 4. 6-hour rule check
    // We only apply this rule to scheduled bookings with a date and time
    if (
      booking.bookingType === 'scheduled' &&
      booking.date &&
      booking.startTime
    ) {
      const [hours, minutes] = booking.startTime.split(':').map(Number);
      const bookingDateTime = new Date(booking.date);
      bookingDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      if (bookingDateTime < sixHoursLater) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cancellation is only allowed at least 6 hours before the scheduled time',
        );
      }
    }

    // 5. Update booking status
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = new mongoose.Types.ObjectId(userId);
    if (cancelReason) {
      booking.cancelReason = cancelReason;
    }

    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    return booking;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getConsultantTotalConsultations = async (consultantId: string) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(consultantId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid consultant ID');
  }

  const totalConsultations = await Consultation.countDocuments({
    consultant: new mongoose.Types.ObjectId(consultantId),
    status: 'completed',
  });

  return {
    consultantId,
    totalConsultations,
  };
};

export const ConsultationService = {
  setAvailability,
  getAvailableSlots,
  createBooking,
  getMyBookings,
  updateBookingStatus,
  getConsultantTotalConsultations,
  rescheduleBooking,
  cancelBooking,
};
