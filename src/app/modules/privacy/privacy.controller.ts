import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PrivacyService } from './privacy.service';

const createPrivacy = catchAsync(async (req: Request, res: Response) => {
  const result = await PrivacyService.createPrivacy(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Privacy Policy created/updated successfully',
    data: result,
  });
});

const getPrivacy = catchAsync(async (req: Request, res: Response) => {
  const result = await PrivacyService.getPrivacy();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Privacy Policy retrieved successfully',
    data: result,
  });
});

const updatePrivacy = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PrivacyService.updatePrivacy(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Privacy Policy updated successfully',
    data: result,
  });
});

export const PrivacyController = {
  createPrivacy,
  getPrivacy,
  updatePrivacy,
};
