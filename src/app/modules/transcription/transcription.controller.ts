import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TranscriptionService } from './transcription.service';

const startTranscription = catchAsync(async (req: Request, res: Response) => {
  const { consultationId } = req.params;
  const result = await TranscriptionService.startTranscription(consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transcription started successfully',
    data: result,
  });
});

const stopTranscription = catchAsync(async (req: Request, res: Response) => {
  const { consultationId } = req.params;
  await TranscriptionService.stopTranscription(consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transcription stopped successfully',
  });
});

const getTranscriptHistory = catchAsync(async (req: Request, res: Response) => {
  const { consultationId } = req.params;
  const result = await TranscriptionService.getTranscriptHistory(consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transcript history retrieved successfully',
    data: result,
  });
});

const handleCallback = catchAsync(async (req: Request, res: Response) => {
  // Agora STT Callback
  await TranscriptionService.handleTranscriptionCallback(req.body);

  res.status(StatusCodes.OK).send('OK');
});

export const TranscriptionController = {
  startTranscription,
  stopTranscription,
  getTranscriptHistory,
  handleCallback,
};
