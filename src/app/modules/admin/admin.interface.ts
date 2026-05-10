export type IDashboardSummary = {
  totalRevenue: number;
  todayConsultationTime: number; // in seconds
  totalUsers: number;
  newRegistrations: {
    month: string;
    count: number;
  }[];
};

export type IRevenueSummary = {
  totalLifetimeRevenue: number;
  currentMonthRevenue: number;
};
