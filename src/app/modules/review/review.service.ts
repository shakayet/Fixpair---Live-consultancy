import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Consultation } from '../consultation/consultation.model';
import { IReview } from './review.interface';
import { Review } from './review.model';
import mongoose from 'mongoose';
import { User } from '../user/user.model';
import { cacheHelper } from '../../utils/cache';

/**
 * Helper to update consultant precomputed stats
 */
const updateConsultantStats = async (
  consultantId: string | mongoose.Types.ObjectId,
) => {
  const stats = await Review.aggregate([
    {
      $match: {
        consultant: new mongoose.Types.ObjectId(consultantId.toString()),
      },
    },
    {
      $group: {
        _id: '$consultant',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const avgRating =
    stats.length > 0 ? parseFloat(stats[0].avgRating.toFixed(1)) : 0;
  const totalReviews = stats.length > 0 ? stats[0].totalReviews : 0;

  await User.findByIdAndUpdate(consultantId, {
    averageRating: avgRating,
    totalReviews: totalReviews,
  });

  // Invalidate related caches
  cacheHelper.clearByPrefix('consultants:recommended');
  cacheHelper.clearByPrefix(`consultants:list`);
  cacheHelper.clearByPrefix(`reviews:list:${consultantId}`);
  cacheHelper.clearByPrefix('reviews:recent');
};

const createReview = async (
  user: JwtPayload,
  payload: { consultationId: string; rating: number; comment: string },
) => {
  const { consultationId, rating, comment } = payload;

  // 1. Check if consultation exists and is completed
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Consultation not found');
  }

  if (consultation.status !== 'completed') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Review can only be created for completed consultations',
    );
  }

  // 2. Check ownership (only the user who had the consultation can review)
  if (consultation.user.toString() !== user.id) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to review this consultation',
    );
  }

  // 3. Check if review already exists for this consultation
  const existingReview = await Review.findOne({ consultation: consultationId });
  if (existingReview) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Review already exists for this consultation',
    );
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

  // Update consultant precomputed fields
  await updateConsultantStats(consultation.consultant);

  return result;
};

const getReviewsByConsultant = async (
  consultantId: string,
  query: Record<string, unknown>,
) => {
  const cacheKey = `reviews:list:${consultantId}:${JSON.stringify(query)}`;
  const cachedData = cacheHelper.get<any>(cacheKey);
  if (cachedData) return cachedData;

  const reviewQuery = new QueryBuilder(
    Review.find({ consultant: consultantId }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery
    .populate([
      { path: 'user', select: 'name image avatar' },
      { path: 'consultant', select: 'name image avatar' },
    ])
    .lean();
  const meta = await reviewQuery.getPaginationInfo();

  const response = { result, meta };
  cacheHelper.set(cacheKey, response, 300); // 5 mins

  return response;
};

const updateReview = async (
  user: JwtPayload,
  reviewId: string,
  payload: Partial<IReview>,
) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  // Check ownership
  if (review.user.toString() !== user.id) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only update your own reviews',
    );
  }

  const result = await Review.findByIdAndUpdate(reviewId, payload, {
    new: true,
  });

  if (result) {
    await updateConsultantStats(result.consultant);
  }

  return result;
};

const deleteReview = async (user: JwtPayload, reviewId: string) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  // Check ownership
  if (review.user.toString() !== user.id) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only delete your own reviews',
    );
  }

  await Review.findByIdAndDelete(reviewId);

  // Update consultant precomputed fields
  await updateConsultantStats(review.consultant);

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

  return stats.length > 0
    ? {
        avgRating: parseFloat(stats[0].avgRating.toFixed(1)),
        totalReviews: stats[0].totalReviews,
      }
    : { avgRating: 0, totalReviews: 0 };
};

const getBulkConsultantStats = async (consultantIds: string[]) => {
  const ids = consultantIds.map(id => new mongoose.Types.ObjectId(id));
  const stats = await Review.aggregate([
    { $match: { consultant: { $in: ids } } },
    {
      $group: {
        _id: '$consultant',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const statsMap: Record<string, { avgRating: number; totalReviews: number }> =
    {};
  stats.forEach(s => {
    statsMap[s._id.toString()] = {
      avgRating: parseFloat(s.avgRating.toFixed(1)),
      totalReviews: s.totalReviews,
    };
  });

  return statsMap;
};

const getRecentReviews = async () => {
  const cacheKey = 'reviews:recent';
  const cachedData = cacheHelper.get<any>(cacheKey);
  if (cachedData) return cachedData;

  const result = await Review.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate([
      { path: 'user', select: 'name image avatar' },
      { path: 'consultant', select: 'name image avatar' },
    ])
    .lean();

  cacheHelper.set(cacheKey, result, 300); // 5 mins
  return result;
};

export const ReviewService = {
  createReview,
  getReviewsByConsultant,
  updateReview,
  deleteReview,
  getConsultantStats,
  getBulkConsultantStats,
  getRecentReviews,
};
