import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { InvoiceService } from './invoice.service';

const getInvoiceData = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { consultationId } = req.params;
  const result = await InvoiceService.getInvoiceDataFromDB(user, consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Consultation invoice data retrieved successfully',
    data: result,
  });
});

const downloadInvoicePDF = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { consultationId } = req.params;
  const pdfUrl = await InvoiceService.generateAndGetInvoicePDF(user, consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Invoice PDF generated successfully',
    data: { pdfUrl },
  });
});

export const InvoiceController = {
  getInvoiceData,
  downloadInvoicePDF,
};
