import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

export const generateAgoraToken = (
  channelName: string,
  uid: number = 0
) => {
  const appId = config.agora.appId;
  const appCertificate = config.agora.appCertificate;

  if (!appId || !appCertificate) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Agora App ID or Certificate not configured'
    );
  }

  const expirationTimeInSeconds = config.agora.expirationTime;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Both sides and STT agent need publishing privileges
  const agoraRole = RtcRole.PUBLISHER;

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
