import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ReviewController } from './review.controller';
import { ReviewValidation } from './review.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.USER),
    validateRequest(ReviewValidation.createReviewZodSchema),
    ReviewController.createReview,
  );

router.get(
  '/consultant/:consultantId',
  ReviewController.getReviewsByConsultant,
);

router.get('/stats/:consultantId', ReviewController.getConsultantStats);

router
  .route('/:id')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(ReviewValidation.updateReviewZodSchema),
    ReviewController.updateReview,
  )
  .delete(auth(USER_ROLES.USER), ReviewController.deleteReview);

export const ReviewRoutes = router;
