import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Consultation } from '../consultation/consultation.model';
import { IReview } from './review.interface';
import { Review } from './review.model';
import mongoose from 'mongoose';

const createReview = async (user: JwtPayload, payload: { consultationId: string; rating: number; comment: string }) => {
  const { consultationId, rating, comment } = payload;

  // 1. Check if consultation exists and is completed
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Consultation not found');
  }

  if (consultation.status !== 'completed') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Review can only be created for completed consultations');
  }

  // 2. Check ownership (only the user who had the consultation can review)
  if (consultation.user.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to review this consultation');
  }

  // 3. Check if review already exists for this consultation
  const existingReview = await Review.findOne({ consultation: consultationId });
  if (existingReview) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Review already exists for this consultation');
  }

  // 4. Create review
  const reviewData: IReview = {
    user: new mongoose.Types.ObjectId(user.id),
    consultant: consultation.consultant,
    consultation: new mongoose.Types.ObjectId(consultationId),
    rating,
    comment,
  };

  const result = await Review.create(reviewData);
  return result;
};

const getReviewsByConsultant = async (consultantId: string, query: Record<string, unknown>) => {
  const reviewQuery = new QueryBuilder(Review.find({ consultant: consultantId }), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery.populate([
    { path: 'user', select: 'name image avatar' },
    { path: 'consultant', select: 'name image avatar' }
  ]);
  const meta = await reviewQuery.getPaginationInfo();

  return { result, meta };
};

const updateReview = async (user: JwtPayload, reviewId: string, payload: Partial<IReview>) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  // Check ownership
  if (review.user.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only update your own reviews');
  }

  const result = await Review.findByIdAndUpdate(reviewId, payload, { new: true });
  return result;
};

const deleteReview = async (user: JwtPayload, reviewId: string) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  // Check ownership
  if (review.user.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only delete your own reviews');
  }

  await Review.findByIdAndDelete(reviewId);
  return null;
};

const getConsultantStats = async (consultantId: string) => {
  const stats = await Review.aggregate([
    { $match: { consultant: new mongoose.Types.ObjectId(consultantId) } },
    {
      $group: {
        _id: '$consultant',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return stats.length > 0 ? stats[0] : { avgRating: 0, totalReviews: 0 };
};

export const ReviewService = {
  createReview,
  getReviewsByConsultant,
  updateReview,
  deleteReview,
  getConsultantStats,
};
