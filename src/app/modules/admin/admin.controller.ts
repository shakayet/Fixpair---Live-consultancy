import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.service';

const getDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardSummary();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dashboard summary retrieved successfully',
    data: result,
  });
});

const getActiveConsultations = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getActiveConsultations();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Active consultations count retrieved successfully',
    data: result,
  });
});

const getRevenueSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getRevenueSummary();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Revenue summary retrieved successfully',
    data: result,
  });
});

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllTransactions(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transactions retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

export const AdminController = {
  getDashboardSummary,
  getActiveConsultations,
  getRevenueSummary,
  getAllTransactions,
};
