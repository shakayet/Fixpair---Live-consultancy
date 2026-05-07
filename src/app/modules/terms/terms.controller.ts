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
    message: 'Terms & Conditions created successfully',
    data: result,
  });
});

const getAllTerms = catchAsync(async (req: Request, res: Response) => {
  const result = await TermsService.getAllTerms(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Terms & Conditions retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

const getSingleTerms = catchAsync(async (req: Request, res: Response) => {
  const result = await TermsService.getSingleTerms(req.params.id);

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

const deleteTerms = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TermsService.deleteTerms(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Terms & Conditions deleted successfully',
    data: result,
  });
});

export const TermsController = {
  createTerms,
  getAllTerms,
  getSingleTerms,
  updateTerms,
  deleteTerms,
};
