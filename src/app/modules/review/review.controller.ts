/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ReviewService } from './review.service';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await ReviewService.createReview(user, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Review created successfully',
    data: result,
  });
});

const getReviewsByConsultant = catchAsync(
  async (req: Request, res: Response) => {
    const { consultantId } = req.params;
    const result = await ReviewService.getReviewsByConsultant(
      consultantId,
      req.query,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reviews retrieved successfully',
      pagination: result.meta,
      data: result.result,
    });
  },
);

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;
  const result = await ReviewService.updateReview(user, id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review updated successfully',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;
  await ReviewService.deleteReview(user, id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review deleted successfully',
  });
});

const getConsultantStats = catchAsync(async (req: Request, res: Response) => {
  const { consultantId } = req.params;
  const result = await ReviewService.getConsultantStats(consultantId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Consultant statistics retrieved successfully',
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getReviewsByConsultant,
  updateReview,
  deleteReview,
  getConsultantStats,
};
