import axios from 'axios';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const AGORA_API_BASE_URL = 'https://api.agora.io/v1/projects';

const getBasicAuth = () => {
  const credentials = Buffer.from(
    `${config.agora.customerId}:${config.agora.customerSecret}`
  ).toString('base64');
  return `Basic ${credentials}`;
};

/**
 * Acquire a resource ID for STT
 */
const acquireResource = async (channelName: string, uid: string) => {
  try {
    const response = await axios.post(
      `${AGORA_API_BASE_URL}/${config.agora.appId}/rt-transcription/acquire`,
      {
        instanceId: channelName,
      },
      {
        headers: {
          Authorization: getBasicAuth(),
        },
      }
    );
    return response.data.resourceId;
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Agora Acquire Error: ${error.response?.data?.message || error.message}`
    );
  }
};

/**
 * Start a transcription task
 */
const startTranscription = async (
  resourceId: string,
  channelName: string,
  token: string
) => {
  try {
    const response = await axios.post(
      `${AGORA_API_BASE_URL}/${config.agora.appId}/rt-transcription/jobs?resourceId=${resourceId}`,
      {
        config: {
          features: ['recognize'],
          recognizeConfig: {
            language: 'en-US', // Default language
            model: 'Model', // General model
            output: {
              cloudStorage: [], // We use data stream for live subtitles
            },
          },
        },
        rtcConfig: {
          channelName: channelName,
          subInAllChannels: false,
          token: token,
          uid: '9001', // Fixed UID for STT Agent as per requirement
        },
      },
      {
        headers: {
          Authorization: getBasicAuth(),
        },
      }
    );
    return response.data.taskId;
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Agora Start Error: ${error.response?.data?.message || error.message}`
    );
  }
};

/**
 * Stop a transcription task
 */
const stopTranscription = async (taskId: string) => {
  try {
    await axios.delete(
      `${AGORA_API_BASE_URL}/${config.agora.appId}/rt-transcription/jobs/${taskId}`,
      {
        headers: {
          Authorization: getBasicAuth(),
        },
      }
    );
  } catch (error: any) {
    // If it's already stopped, we don't want to crash
    console.error('Agora Stop Error:', error.response?.data?.message || error.message);
  }
};

export const AgoraSttHelper = {
  acquireResource,
  startTranscription,
  stopTranscription,
};
