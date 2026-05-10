import express from 'express';
import { NextFunction, Request, Response } from 'express';
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
    (req: Request, res: Response, next: NextFunction) => {
      if (req.body.data) {
        req.body = ReportValidation.createReportZodSchema.parse({
          body: JSON.parse(req.body.data),
        }).body;
      }
      return ReportController.createReport(req, res, next);
    },
  )
  .get(
    auth(
      USER_ROLES.USER,
      USER_ROLES.CONSULTANT,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ),
    ReportController.getReports,
  );

router.get(
  '/:id',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  ReportController.getSingleReport,
);

export const ReportRoutes = router;
