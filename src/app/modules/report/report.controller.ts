/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ReportService } from './report.service';

const createReport = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await ReportService.createReport(user, req.body, req.files);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Consultation report finalized and PDF generated successfully',
    data: result,
  });
});

const getReports = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await ReportService.getReports(user, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reports retrieved successfully',
    ...(result.meta ? { meta: result.meta } : {}),
    data: result.result,
  });
});

const getSingleReport = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;
  const result = await ReportService.getSingleReport(user, id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report retrieved successfully',
    data: result,
  });
});

export const ReportController = {
  createReport,
  getReports,
  getSingleReport,
};
