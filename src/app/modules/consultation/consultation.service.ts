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
        'Slots must be within the next 30 days',
      );
    }
  });

  // 2. Check for overlapping slots in the input
  // (Simple version: just ensure uniqueness of date+time for this consultant)

  // 3. Upsert availability
  const result = await Availability.findOneAndUpdate(
    { consultant: consultantId },
    {
      $set: {
        consultant: consultantId,
        slots: slots.map(s => ({ ...s, isBooked: false })),
      },
    },
    { upsert: true, new: true },
  );

  return result;
};

const getAvailableSlots = async (consultantId: string, date?: string) => {
  const availability = await Availability.findOne({ consultant: consultantId });
  if (!availability) {
    return [];
  }

  // Filter only unbooked slots
  let slots = availability.slots.filter(slot => !slot.isBooked);

  // If date is provided, filter by that specific date
  if (date) {
    // Ensure we compare only the date part (YYYY-MM-DD)
    const targetDate = new Date(date).toISOString().split('T')[0];
    slots = slots.filter(slot => {
      const slotDate = new Date(slot.date).toISOString().split('T')[0];
      return slotDate === targetDate;
    });
  } else {
    // If no date provided, only show future slots (including today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    slots = slots.filter(slot => new Date(slot.date) >= today);
  }

  return slots;
};

const createBooking = async (
  user: JwtPayload,
  payload: {
    consultantId: string;
    bookingType: 'scheduled' | 'instant' | 'callback';
    slotId?: string;
    preferredWindow?: 'asap' | 'today' | 'tomorrow';
    notes?: string;
  },
) => {
  const { consultantId, bookingType, slotId, preferredWindow, notes } = payload;
  const userId = user.id;

  // 0. Validate if consultantId is a valid consultant
  const consultant = await User.findById(consultantId);
  if (!consultant || consultant.role !== USER_ROLES.CONSULTANT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid consultant ID');
  }

  const perMinuteRate = consultant.perMinuteRate || 0;
  const platformFee = config.payment.billing.platformFee;

  if (bookingType === 'scheduled') {
    if (!slotId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Slot ID is required for scheduled booking',
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find the availability and the specific slot
      const availability = await Availability.findOne({
        consultant: new mongoose.Types.ObjectId(consultantId),
        'slots._id': new mongoose.Types.ObjectId(slotId),
        'slots.isBooked': false,
      }).session(session);

      if (!availability) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Available slot not found');
      }

      const slot = availability.slots.find(s => s._id?.toString() === slotId);
      if (!slot) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found');
      }

      // 2. Validate 30-day window
      const now = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(now.getDate() + 30);
      const slotDate = new Date(slot.date);

      if (slotDate < now || slotDate > thirtyDaysLater) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Booking must be within the next 30 days',
        );
      }

      // 3. Mark slot as booked
      const updatedAvailability = await Availability.findOneAndUpdate(
        {
          consultant: new mongoose.Types.ObjectId(consultantId),
          'slots._id': new mongoose.Types.ObjectId(slotId),
          'slots.isBooked': false,
        },
        { $set: { 'slots.$.isBooked': true } },
        { session, new: true },
      );

      if (!updatedAvailability) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          'Slot was already booked by someone else',
        );
      }

      // 4. Create the consultation record
      const consultationData: any = {
        user: new mongoose.Types.ObjectId(userId),
        consultant: new mongoose.Types.ObjectId(consultantId),
        bookingType: 'scheduled',
        slotId: new mongoose.Types.ObjectId(slotId),
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'pending', // Scheduled bookings start as pending until consultant accepts
        paymentStatus: 'pending',
        perMinuteRate,
        platformFee,
      };
      if (notes) consultationData.notes = notes;

      const result = await Consultation.create([consultationData], { session });

      await session.commitTransaction();
      session.endSession();

      return result[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
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

    // If cancelling or rejecting a scheduled booking, free up the slot
    if (
      (status === 'cancelled' || status === 'rejected') &&
      booking.status !== 'cancelled' &&
      booking.status !== 'rejected' &&
      booking.bookingType === 'scheduled' &&
      booking.slotId
    ) {
      await Availability.findOneAndUpdate(
        { consultant: booking.consultant, 'slots._id': booking.slotId },
        { $set: { 'slots.$.isBooked': false } },
        { session },
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

const deleteExpiredSlots = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await Availability.updateMany(
    {},
    {
      $pull: {
        slots: {
          date: { $lt: today },
        },
      },
    },
  );

  return result;
};

const rescheduleBooking = async (
  user: JwtPayload,
  bookingId: string,
  payload: { newSlotId: string },
) => {
  const { newSlotId } = payload;
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

    // 2. Validate booking type (only scheduled bookings can be rescheduled via slots)
    if (booking.bookingType !== 'scheduled' || !booking.slotId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Only scheduled bookings can be rescheduled',
      );
    }

    // 3. Validate 6-hour rule
    // slot.date is Date, startTime is "HH:mm"
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

    // 4. Find the new availability slot
    const availability = await Availability.findOne({
      consultant: booking.consultant,
      'slots._id': new mongoose.Types.ObjectId(newSlotId),
      'slots.isBooked': false,
    }).session(session);

    if (!availability) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'New selected slot is not available',
      );
    }

    const newSlot = availability.slots.find(
      s => s._id?.toString() === newSlotId,
    );
    if (!newSlot) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'New slot not found');
    }

    // 5. Release the old slot
    await Availability.findOneAndUpdate(
      {
        consultant: booking.consultant,
        'slots._id': booking.slotId,
      },
      { $set: { 'slots.$.isBooked': false } },
      { session },
    );

    // 6. Book the new slot
    const updatedAvailability = await Availability.findOneAndUpdate(
      {
        consultant: booking.consultant,
        'slots._id': new mongoose.Types.ObjectId(newSlotId),
        'slots.isBooked': false,
      },
      { $set: { 'slots.$.isBooked': true } },
      { session, new: true },
    );

    if (!updatedAvailability) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'New slot was already booked by someone else',
      );
    }

    // 7. Update the booking record
    booking.slotId = new mongoose.Types.ObjectId(newSlotId);
    booking.date = newSlot.date;
    booking.startTime = newSlot.startTime;
    booking.endTime = newSlot.endTime;
    booking.status = 'pending'; // Automatically revert to pending

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

    // 6. If it was a scheduled booking, free up the slot
    if (booking.bookingType === 'scheduled' && booking.slotId) {
      await Availability.findOneAndUpdate(
        { consultant: booking.consultant, 'slots._id': booking.slotId },
        { $set: { 'slots.$.isBooked': false } },
        { session },
      );
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
  deleteExpiredSlots,
  getConsultantTotalConsultations,
  rescheduleBooking,
  cancelBooking,
};
