import express from 'express';
import { RecommendationController } from './recommendation.controller';

const router = express.Router();

router.get('/recommended', RecommendationController.getRecommendedConsultants);

export const RecommendationRoutes = router;
