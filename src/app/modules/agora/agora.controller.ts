import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { generateAgoraToken } from '../../../helpers/agoraTokenHelper';
import config from '../../../config';

const getToken = catchAsync(async (req: Request, res: Response) => {
  const { channelName, uid, role } = req.query;

  if (!channelName || !uid) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'channelName and uid are required',
    });
  }

  const token = generateAgoraToken(
    channelName as string,
    Number(uid),
    (role as 'publisher' | 'subscriber') || 'publisher',
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Token generated successfully',
    data: {
      appId: config.agora.appId,
      channelName,
      uid: Number(uid),
      token,
    },
  });
});

export const AgoraController = {
  getToken,
};
