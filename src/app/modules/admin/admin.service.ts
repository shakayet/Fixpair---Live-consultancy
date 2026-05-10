import { StatusCodes } from 'http-status-codes';
import { Transaction } from '../payment/payment.model';
import { User } from '../user/user.model';
import { VideoSession } from '../videoSession/videoSession.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { IDashboardSummary, IRevenueSummary } from './admin.interface';

const getDashboardSummary = async (): Promise<IDashboardSummary> => {
  // 1. Total Revenue (sum of all captured transactions)
  const totalRevenueResult = await Transaction.aggregate([
    { $match: { status: 'captured' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalRevenue = totalRevenueResult[0]?.total || 0;

  // 2. Today's total consultation time
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todayConsultationTimeResult = await VideoSession.aggregate([
    {
      $match: {
        status: 'ended',
        endedAt: { $gte: startOfToday, $lte: endOfToday },
      },
    },
    { $group: { _id: null, totalDuration: { $sum: '$duration' } } },
  ]);
  const todayConsultationTime = todayConsultationTimeResult[0]?.totalDuration || 0;

  // 3. Total number of users
  const totalUsers = await User.countDocuments();

  // 4. New registrations for the last 2 months (grouped by month)
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  twoMonthsAgo.setDate(1); // Start of month

  const newRegistrations = await User.aggregate([
    { $match: { createdAt: { $gte: twoMonthsAgo } } },
    {
      $group: {
        _id: {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            { $toString: '$_id.month' },
          ],
        },
        count: 1,
      },
    },
  ]);

  return {
    totalRevenue,
    todayConsultationTime,
    totalUsers,
    newRegistrations,
  };
};

const getActiveConsultations = async (): Promise<{ count: number }> => {
  const count = await VideoSession.countDocuments({ status: 'ongoing' });
  return { count };
};

const getRevenueSummary = async (): Promise<IRevenueSummary> => {
  // Total lifetime revenue
  const totalRevenueResult = await Transaction.aggregate([
    { $match: { status: 'captured' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalLifetimeRevenue = totalRevenueResult[0]?.total || 0;

  // Current month's revenue
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentMonthRevenueResult = await Transaction.aggregate([
    {
      $match: {
        status: 'captured',
        createdAt: { $gte: startOfMonth },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const currentMonthRevenue = currentMonthRevenueResult[0]?.total || 0;

  return {
    totalLifetimeRevenue,
    currentMonthRevenue,
  };
};

const getAllTransactions = async (query: Record<string, unknown>) => {
  const transactionQuery = new QueryBuilder(
    Transaction.find().populate([
      { path: 'user', select: 'name email' },
      { path: 'consultant', select: 'name email' },
      { path: 'consultation' },
    ]),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await transactionQuery.modelQuery;
  const meta = await transactionQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

export const AdminService = {
  getDashboardSummary,
  getActiveConsultations,
  getRevenueSummary,
  getAllTransactions,
};
