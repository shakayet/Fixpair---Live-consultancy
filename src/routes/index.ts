import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { OAuthRoutes } from '../app/modules/passport/oauth.route';
import { ReviewRoutes } from '../app/modules/review/review.route';
import { ConsultationRoutes } from '../app/modules/consultation/consultation.route';
import { FaqRoutes } from '../app/modules/faq/faq.route';
import { TermsRoutes } from '../app/modules/terms/terms.route';
import { PrivacyRoutes } from '../app/modules/privacy/privacy.route';
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
    path: '/oauth',
    route: OAuthRoutes,
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
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
