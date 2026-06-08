/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import axios from 'axios';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { errorLogger, logger } from '../shared/logger';

const AGORA_API_BASE_URL = 'https://api.agora.io/v1/projects';

const getBasicAuth = () => {
  const customerId = config.agora.customerId?.trim();
  const customerSecret = config.agora.customerSecret?.trim();

  if (!customerId || !customerSecret) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Agora Customer ID or Secret not configured',
    );
  }

  const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString(
    'base64',
  );
  return `Basic ${credentials}`;
};

/**
 * Acquire a resource ID for STT
 */
const acquireResource = async (channelName: string) => {
  const appId = config.agora.appId?.trim();
  if (!appId) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Agora App ID not configured',
    );
  }

  try {
    const response = await axios.post(
      `${AGORA_API_BASE_URL}/${appId}/rt-transcription/acquire`,
      {
        instanceId: channelName,
      },
      {
        headers: {
          Authorization: getBasicAuth(),
        },
      },
    );

    logger.info(
      `Agora STT resource acquired | appId=${appId} channel=${channelName} resourceId=${response.data.resourceId}`,
    );

    return response.data.resourceId;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
    errorLogger.error(
      `Agora STT acquire failed | appId=${appId} channel=${channelName} status=${status} message=${errorMessage}`,
    );

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Agora Acquire Error: ${errorMessage}`,
    );
  }
};

/**
 * Start a transcription task
 */
const startTranscription = async (
  resourceId: string,
  channelName: string,
  token: string,
) => {
  const appId = config.agora.appId?.trim();
  try {
    const response = await axios.post(
      `${AGORA_API_BASE_URL}/${appId}/rt-transcription/jobs?resourceId=${resourceId}`,
      {
        config: {
          features: ['recognize'],
          recognizeConfig: {
            language: 'en-US', // Default language
            model: 0, // General model (0 is default)
            output: {
              cloudStorage: [], // Using data stream; cloud storage optional if data stream enabled
            },
          },
        },
        rtcConfig: {
          channelName: channelName,
          subInAllChannels: false,
          token: token,
          uid: 9001, // Fixed numeric UID for STT Agent
        },
      },
      {
        headers: {
          Authorization: getBasicAuth(),
        },
      },
    );
    logger.info(
      `Agora STT task started | appId=${appId} channel=${channelName} resourceId=${resourceId} taskId=${response.data.taskId}`,
    );

    return response.data.taskId;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
    errorLogger.error(
      `Agora STT start failed | appId=${appId} channel=${channelName} resourceId=${resourceId} status=${status} message=${errorMessage}`,
    );

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Agora Start Error: ${errorMessage}`,
    );
  }
};

/**
 * Stop a transcription task
 */
const stopTranscription = async (taskId: string) => {
  const appId = config.agora.appId?.trim();
  try {
    await axios.delete(
      `${AGORA_API_BASE_URL}/${appId}/rt-transcription/jobs/${taskId}`,
      {
        headers: {
          Authorization: getBasicAuth(),
        },
      },
    );

    logger.info(`Agora STT task stopped | appId=${appId} taskId=${taskId}`);
  } catch (error: any) {
    // If it's already stopped, we don't want to crash the call-end flow
    errorLogger.error(
      `Agora STT stop failed | appId=${appId} taskId=${taskId} message=${
        error.response?.data?.message || error.message
      }`,
    );
  }
};

export const AgoraSttHelper = {
  acquireResource,
  startTranscription,
  stopTranscription,
};
