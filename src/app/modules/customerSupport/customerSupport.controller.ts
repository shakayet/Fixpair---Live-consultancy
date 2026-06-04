import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CustomerSupportService } from './customerSupport.service';

const createOrUpdateCustomerSupport = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CustomerSupportService.createOrUpdateCustomerSupportToDB(
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Customer support information updated successfully',
      data: result,
    });
  },
);

const getCustomerSupport = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportService.getCustomerSupportFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Customer support information retrieved successfully',
    data: result,
  });
});

export const CustomerSupportController = {
  createOrUpdateCustomerSupport,
  getCustomerSupport,
};
