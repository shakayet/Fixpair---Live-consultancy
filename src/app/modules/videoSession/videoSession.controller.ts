import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { VideoSessionService } from './videoSession.service';

const createSession = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { consultationId } = req.body;
  const result = await VideoSessionService.createSession(user, consultationId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Video session created successfully',
    data: result,
  });
});

const joinSession = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { sessionId } = req.body;
  const result = await VideoSessionService.joinSession(user, sessionId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Joined video session successfully',
    data: result,
  });
});

const endSession = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { sessionId } = req.body;
  const result = await VideoSessionService.endSession(user, sessionId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Video session ended successfully',
    data: result,
  });
});

const getMySessions = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await VideoSessionService.getMySessions(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Video sessions retrieved successfully',
    data: result,
  });
});

export const VideoSessionController = {
  createSession,
  joinSession,
  endSession,
  getMySessions,
};
