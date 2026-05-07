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
  .get(TermsController.getAllTerms);

router
  .route('/:id')
  .get(TermsController.getSingleTerms)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(TermsValidation.updateTermsZodSchema),
    TermsController.updateTerms,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    TermsController.deleteTerms,
  );

export const TermsRoutes = router;
