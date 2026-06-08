import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

export const generateAgoraToken = (
  channelName: string,
  uid: number = 0,
  role: 'publisher' | 'subscriber' = 'publisher'
) => {
  const appId = config.agora.appId?.trim();
  const appCertificate = config.agora.appCertificate?.trim();

  if (!appId || !appCertificate) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Agora App ID or Certificate not configured'
    );
  }

  const expirationTimeInSeconds = config.agora.expirationTime || 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Map string role to Agora RtcRole
  const agoraRole =
    role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs
  );

  return token;
};
