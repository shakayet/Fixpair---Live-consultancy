import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TranscriptionService } from './transcription.service';

const startTranscription = catchAsync(async (req: Request, res: Response) => {
  const consultationId = req.params.consultationId || req.body.consultationId;

  if (!consultationId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'consultationId is required',
    });
  }

  const result = await TranscriptionService.startTranscription(consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transcription started successfully',
    data: result,
  });
});

const stopTranscription = catchAsync(async (req: Request, res: Response) => {
  const consultationId = req.params.consultationId || req.body.consultationId;

  if (!consultationId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'consultationId is required',
    });
  }

  await TranscriptionService.stopTranscription(consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transcription stopped successfully',
  });
});

const getTranscriptHistory = catchAsync(async (req: Request, res: Response) => {
  const consultationId =
    req.params.consultationId || req.query.consultationId;

  if (!consultationId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'consultationId is required',
    });
  }

  const result = await TranscriptionService.getTranscriptHistory(
    consultationId as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transcript history retrieved successfully',
    data: result,
  });
});

const ingestTranscript = catchAsync(async (req: Request, res: Response) => {
  const consultationId = req.params.consultationId;
  const { uid, text, isFinal, timestamp } = req.body;

  if (
    !consultationId ||
    uid === undefined ||
    !text ||
    timestamp === undefined
  ) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'uid, text and timestamp are required',
    });
  }

  await TranscriptionService.ingestTranscriptChunk(
    req.user as JwtPayload,
    consultationId,
    {
      uid: Number(uid),
      text: String(text),
      isFinal: Boolean(isFinal),
      timestamp,
    },
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transcript chunk received',
  });
});

export const TranscriptionController = {
  startTranscription,
  stopTranscription,
  getTranscriptHistory,
  ingestTranscript,
};
