/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { cacheHelper } from '../../utils/cache';
import { monitorDB } from '../../utils/db-perf';

const getRecommendedConsultants = async () => {
  const cacheKey = 'consultants:recommended';
  const cachedData = cacheHelper.get<any>(cacheKey);
  if (cachedData) return cachedData;

  const consultants = await monitorDB('getRecommendedConsultants', () =>
    User.find({
      role: USER_ROLES.CONSULTANT,
      status: 'active',
      verified: true,
      consultancyType: { $ne: null },
    })
      .select(
        'name firstName lastName consultancyType expertise averageRating totalConsultations totalReviews perMinuteRate visitFee image avatar activeStatus',
      )
      .sort({
        consultancyType: 1,
        averageRating: -1,
        totalConsultations: -1,
      })
      .lean(),
  );

  // Group by category and slice top 5 manually (faster than aggregation for this size)
  const grouped: Record<string, any[]> = {};
  consultants.forEach(c => {
    const type = c.consultancyType as string;
    if (!grouped[type]) grouped[type] = [];
    if (grouped[type].length < 5) {
      grouped[type].push({
        ...c,
        rating: c.averageRating,
        tag: 'Recommended',
      });
    }
  });

  const result = Object.entries(grouped).map(([category, consultants]) => ({
    category,
    consultants,
  }));

  cacheHelper.set(cacheKey, result, 300); // 5 mins
  return result;
};

export const RecommendationService = {
  getRecommendedConsultants,
};
