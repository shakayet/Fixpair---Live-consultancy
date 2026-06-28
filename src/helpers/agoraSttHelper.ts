/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import axios from 'axios';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { errorLogger, logger } from '../shared/logger';

// Agora Real-Time STT REST API v7.x
// Old path (/v1/projects/{appId}/rt-transcription/...) was removed by Agora.
const AGORA_STT_BASE_URL = 'https://api.agora.io/api/speech-to-text/v1/projects';

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
 * Start an Agora Real-Time STT agent in the channel.
 * Single API call — no separate "acquire" step in v7.x.
 * Returns the agent_id used for subsequent stop calls.
 */
const startTranscription = async (
  channelName: string,
  botToken: string,
): Promise<string> => {
  const appId = config.agora.appId?.trim();
  if (!appId) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Agora App ID not configured',
    );
  }

  try {
    // Sanity-check the token before sending — an empty/undefined token means
    // the STT agent will be rejected by Agora and UID 9001 never joins.
    const tokenStatus = !botToken
      ? 'MISSING'
      : botToken.length < 20
        ? `SUSPICIOUSLY_SHORT(${botToken.length})`
        : `OK(len=${botToken.length})`;
    logger.info(
      `Agora STT agent starting | appId=${appId} channel=${channelName} botToken=${tokenStatus} subscribeUids=1001,2001`,
    );
    const response = await axios.post(
      `${AGORA_STT_BASE_URL}/${appId}/join`,
      {
        name: `stt-${channelName}`,
        languages: ['en-US'],
        maxIdleTime: 50,
        rtcConfig: {
          channelName,
          subBotUid: '9001',
          subBotToken: botToken,
          pubBotUid: '9001',
          pubBotToken: botToken,
          // Explicitly subscribe to both speaker UIDs — without this the bot
          // may only transcribe one participant by default.
          subscribeAudioUids: ['1001', '2001'],
        },
      },
      {
        headers: { Authorization: getBasicAuth() },
      },
    );

    const agentId: string = response.data.agent_id;
    logger.info(
      `Agora STT agent started | appId=${appId} channel=${channelName} agentId=${agentId} status=${response.data.status}`,
    );
    return agentId;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
    errorLogger.error(
      `Agora STT start failed | appId=${appId} channel=${channelName} status=${status} message=${errorMessage}`,
    );
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Agora Start Error: ${errorMessage}`,
    );
  }
};

/**
 * Stop a running Agora STT agent by its agent_id.
 */
const stopTranscription = async (agentId: string): Promise<void> => {
  const appId = config.agora.appId?.trim();
  try {
    await axios.post(
      `${AGORA_STT_BASE_URL}/${appId}/agents/${agentId}/leave`,
      {},
      {
        headers: { Authorization: getBasicAuth() },
      },
    );
    logger.info(`Agora STT agent stopped | appId=${appId} agentId=${agentId}`);
  } catch (error: any) {
    // Non-fatal — agent may have already exited on its own (maxIdleTime).
    errorLogger.error(
      `Agora STT stop failed | appId=${appId} agentId=${agentId} message=${
        error.response?.data?.message || error.message
      }`,
    );
  }
};

export const AgoraSttHelper = { startTranscription, stopTranscription };
