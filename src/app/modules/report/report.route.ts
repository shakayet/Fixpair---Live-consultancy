import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import validateRequest from '../../middlewares/validateRequest';
import { ReportController } from './report.controller';
import { ReportValidation } from './report.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.CONSULTANT),
    fileUploadHandler(),
    validateRequest(ReportValidation.createReportZodSchema),
    ReportController.createReport,
  )
  .get(
    auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ReportController.getReports,
  );

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReportController.getSingleReport,
);

export const ReportRoutes = router;
