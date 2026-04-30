import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TermsService } from './terms.service';

const createTerms = catchAsync(async (req: Request, res: Response) => {
  const result = await TermsService.createTerms(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Terms & Conditions created/updated successfully',
    data: result,
  });
});

const getTerms = catchAsync(async (req: Request, res: Response) => {
  const result = await TermsService.getTerms();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Terms & Conditions retrieved successfully',
    data: result,
  });
});

const updateTerms = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TermsService.updateTerms(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Terms & Conditions updated successfully',
    data: result,
  });
});

export const TermsController = {
  createTerms,
  getTerms,
  updateTerms,
};
