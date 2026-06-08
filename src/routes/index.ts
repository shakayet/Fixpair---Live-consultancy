import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { ReviewRoutes } from '../app/modules/review/review.route';
import { ConsultationRoutes } from '../app/modules/consultation/consultation.route';
import { FaqRoutes } from '../app/modules/faq/faq.route';
import { TermsRoutes } from '../app/modules/terms/terms.route';
import { PrivacyRoutes } from '../app/modules/privacy/privacy.route';
import { ReportRoutes } from '../app/modules/report/report.route';
import { VideoSessionRoutes } from '../app/modules/videoSession/videoSession.route';
import { PaymentRoutes } from '../app/modules/payment/payment.route';
import { AdminRoutes } from '../app/modules/admin/admin.route';
import { RecommendationRoutes } from '../app/modules/recommendation/recommendation.route';
import { TranscriptionRoutes } from '../app/modules/transcription/transcription.route';
import { NotificationRoutes } from '../app/modules/notification/notification.route';
import { CustomerSupportRoutes } from '../app/modules/customerSupport/customerSupport.route';
import { AgoraRoutes } from '../app/modules/agora/agora.route';

const router = express.Router();

const apiRoutes = [
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/review',
    route: ReviewRoutes,
  },
  {
    path: '/consultation',
    route: ConsultationRoutes,
  },
  {
    path: '/consultations',
    route: ConsultationRoutes,
  },
  {
    path: '/faq',
    route: FaqRoutes,
  },
  {
    path: '/terms',
    route: TermsRoutes,
  },
  {
    path: '/privacy',
    route: PrivacyRoutes,
  },
  {
    path: '/report',
    route: ReportRoutes,
  },
  {
    path: '/video-session',
    route: VideoSessionRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/recommendation',
    route: RecommendationRoutes,
  },
  {
    path: '/transcription',
    route: TranscriptionRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
  {
    path: '/customer-support',
    route: CustomerSupportRoutes,
  },
  {
    path: '/agora',
    route: AgoraRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
