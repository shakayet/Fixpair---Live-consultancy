import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Availability, Consultation } from './consultation.model';
import { ISlot } from './consultation.interface';

const setAvailability = async (user: JwtPayload, slots: ISlot[]) => {
  const consultantId = user.id;

  // 1. Validate slots are within the next 30 days
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  slots.forEach(slot => {
    const slotDate = new Date(slot.date);
    if (slotDate < now || slotDate > thirtyDaysLater) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Slots must be within the next 30 days');
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
        slots: slots.map(s => ({ ...s, isBooked: false })) 
      } 
    },
    { upsert: true, new: true }
  );

  return result;
};

const getAvailableSlots = async (consultantId: string, date?: string) => {
  const availability = await Availability.findOne({ consultant: consultantId });
  if (!availability) {
    return [];
  }

  let slots = availability.slots.filter(slot => !slot.isBooked);

  if (date) {
    const filterDate = new Date(date).toDateString();
    slots = slots.filter(slot => new Date(slot.date).toDateString() === filterDate);
  }

  return slots;
};

const createBooking = async (user: JwtPayload, payload: { consultantId: string; slotId: string }) => {
  const { consultantId, slotId } = payload;
  const userId = user.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the availability and the specific slot
    const availability = await Availability.findOne({ 
      consultant: consultantId,
      'slots._id': slotId,
      'slots.isBooked': false 
    }).session(session);

    if (!availability) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Available slot not found');
    }

    const slot = availability.slots.find(s => s._id?.toString() === slotId);
    if (!slot) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found');
    }

    // 2. Validate 30-day window again
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);
    const slotDate = new Date(slot.date);

    if (slotDate < now || slotDate > thirtyDaysLater) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking must be within the next 30 days');
    }

    // 3. Mark slot as booked (Atomic operation within transaction)
    const updatedAvailability = await Availability.findOneAndUpdate(
      { 
        consultant: consultantId, 
        'slots._id': slotId, 
        'slots.isBooked': false 
      },
      { $set: { 'slots.$.isBooked': true } },
      { session, new: true }
    );

    if (!updatedAvailability) {
      throw new ApiError(StatusCodes.CONFLICT, 'Slot was already booked by someone else');
    }

    // 4. Create the consultation record
    const result = await Consultation.create([
      {
        user: userId,
        consultant: consultantId,
        slotId: slotId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'pending',
        paymentStatus: 'pending',
      }
    ], { session });

    await session.commitTransaction();
    session.endSession();

    return result[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getMyBookings = async (user: JwtPayload, query: Record<string, unknown>) => {
  const filter: Record<string, any> = {};
  if (user.role === 'USER') {
    filter.user = user.id;
  } else if (user.role === 'CONSULTANT') {
    filter.consultant = user.id;
  }

  const bookingQuery = new QueryBuilder(Consultation.find(filter), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await bookingQuery.modelQuery.populate([
    { path: 'user', select: 'name image avatar' },
    { path: 'consultant', select: 'name image avatar' }
  ]);
  const meta = await bookingQuery.getPaginationInfo();

  return { result, meta };
};

const updateBookingStatus = async (user: JwtPayload, bookingId: string, status: string) => {
  const booking = await Consultation.findById(bookingId);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  // Authorization: Only consultant or admin can update status
  if (user.role !== 'CONSULTANT' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to update booking status');
  }

  const result = await Consultation.findByIdAndUpdate(
    bookingId, 
    { status }, 
    { new: true }
  );
  return result;
};

export const ConsultationService = {
  setAvailability,
  getAvailableSlots,
  createBooking,
  getMyBookings,
  updateBookingStatus,
};
