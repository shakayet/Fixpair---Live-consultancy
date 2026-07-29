import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { generateAgoraToken } from '../../../helpers/agoraTokenHelper';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { VideoSession } from '../videoSession/videoSession.model';

const getToken = catchAsync(async (req: Request, res: Response) => {
  const { channelName, role } = req.query;

  if (!channelName) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'channelName is required',
    });
  }

  const user = req.user as JwtPayload;
  const session = await VideoSession.findOne({ channelName });
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video session not found');
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const isUser = session.user.toString() === user.id;
  const isConsultant = session.consultant.toString() === user.id;
  if (!isAdmin && !isUser && !isConsultant) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not part of this session',
    );
  }

  // Participant UIDs are assigned server-side so clients cannot impersonate
  // the other participant. Admins receive a non-participant subscriber UID.
  const uid = isAdmin ? 3001 : isUser ? 1001 : 2001;
  const token = generateAgoraToken(
    channelName as string,
    uid,
    isAdmin ? 'subscriber' : (role as 'publisher' | 'subscriber') || 'publisher',
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Token generated successfully',
    data: {
      appId: config.agora.appId,
      channelName,
      uid,
      token,
    },
  });
});

export const AgoraController = {
  getToken,
};
