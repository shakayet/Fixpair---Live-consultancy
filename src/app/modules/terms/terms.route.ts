import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TermsController } from './terms.controller';
import { TermsValidation } from './terms.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(TermsValidation.createTermsZodSchema),
    TermsController.createTerms,
  )
  .get(TermsController.getTerms);

router
  .route('/:id')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(TermsValidation.updateTermsZodSchema),
    TermsController.updateTerms,
  );

export const TermsRoutes = router;
