import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { RecommendationService } from './recommendation.service';

const getRecommendedConsultants = catchAsync(
  async (req: Request, res: Response) => {
    const result = await RecommendationService.getRecommendedConsultants();

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Recommended consultants retrieved successfully',
      data: result,
    });
  },
);

export const RecommendationController = {
  getRecommendedConsultants,
};
