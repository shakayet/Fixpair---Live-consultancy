import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';

const getRecommendedConsultants = async () => {
  const recommendationAggregation = await User.aggregate([
    // 1. Match active and approved consultants
    {
      $match: {
        role: USER_ROLES.CONSULTANT,
        status: 'active',
        verified: true,
        consultancyType: { $ne: null },
      },
    },
    // 2. Lookup reviews to calculate average rating
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'consultant',
        as: 'reviews',
      },
    },
    // 3. Lookup consultations to count completed ones
    {
      $lookup: {
        from: 'consultations',
        let: { consultantId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$consultant', '$$consultantId'] },
                  { $eq: ['$status', 'completed'] },
                ],
              },
            },
          },
        ],
        as: 'completedConsultations',
      },
    },
    // 4. Calculate stats and project required fields
    {
      $addFields: {
        averageRating: { $ifNull: [{ $avg: '$reviews.rating' }, 0] },
        totalConsultations: { $size: '$completedConsultations' },
      },
    },
    // 5. Sort by category, then by ranking criteria
    {
      $sort: {
        consultancyType: 1,
        averageRating: -1,
        totalConsultations: -1,
      },
    },
    // 6. Project clean response fields
    {
      $project: {
        _id: 1,
        name: 1,
        firstName: 1,
        lastName: 1,
        consultancyType: 1,
        expertise: 1,
        averageRating: 1,
        totalConsultations: 1,
        perMinuteRate: 1,
        visitFee: 1,
        image: 1,
        avatar: 1,
      },
    },
    // 7. Group by category and slice top 5
    {
      $group: {
        _id: '$consultancyType',
        consultants: { $push: '$$ROOT' },
      },
    },
    {
      $project: {
        category: '$_id',
        consultants: { $slice: ['$consultants', 5] },
        _id: 0,
      },
    },
  ]);

  return recommendationAggregation;
};

export const RecommendationService = {
  getRecommendedConsultants,
};
