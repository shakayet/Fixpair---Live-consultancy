/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import { Consultation } from '../consultation/consultation.model';
import { VideoSession } from '../videoSession/videoSession.model';
import { AgoraSttHelper } from '../../../helpers/agoraSttHelper';
import { Transcript } from './transcription.model';
import { socketHelper } from '../../../helpers/socketHelper';
import { generateAgoraToken } from '../../../helpers/agoraTokenHelper';

const startTranscription = async (consultationId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Consultation not found');
  }

  const session = await VideoSession.findOne({ consultation: consultationId });
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video session not found');
  }

  // Idempotency: if already running (e.g. auto-started by joinSession and
  // frontend also calls /start), skip creating a second agent.
  if (session.isTranscriptionActive && session.sttTaskId) {
    return { agentId: session.sttTaskId };
  }

  // Single API call in Agora STT v7.x — no separate "acquire" step.
  const sttToken = generateAgoraToken(session.channelName, 9001);
  const agentId = await AgoraSttHelper.startTranscription(
    session.channelName,
    sttToken,
  );

  await VideoSession.findByIdAndUpdate(session._id, {
    $set: {
      sttTaskId: agentId,
      isTranscriptionActive: true,
    },
  });

  return { agentId };
};

const stopTranscription = async (consultationId: string) => {
  const session = await VideoSession.findOne({ consultation: consultationId });
  if (!session || !session.sttTaskId) {
    return;
  }

  // 1. Stop transcription
  await AgoraSttHelper.stopTranscription(session.sttTaskId);

  // 2. Update session
  await VideoSession.findByIdAndUpdate(session._id, {
    $set: {
      isTranscriptionActive: false,
    },
  });
};

/**
 * The Agora STT bot (UID 9001) publishes recognized text as RTC data-stream
 * messages inside the channel — only clients connected to that channel can
 * receive them, Agora does not push results to the backend over HTTP. A
 * participant's client relays each chunk it receives here so the backend can
 * persist finalized transcripts and re-broadcast them (e.g. to a web dashboard
 * that isn't joined to the RTC channel) over Socket.IO.
 *
 * channelName/consultation are derived from the session — never trusted from
 * the client — so a participant cannot write transcripts into a consultation
 * they aren't part of.
 */
const ingestTranscriptChunk = async (
  user: JwtPayload,
  consultationId: string,
  chunk: { uid: number; text: string; isFinal: boolean; timestamp: number | string },
) => {
  const session = await VideoSession.findOne({ consultation: consultationId });
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video session not found');
  }

  if (
    session.user.toString() !== user.id &&
    session.consultant.toString() !== user.id
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not part of this session',
    );
  }

  const { uid, text, isFinal, timestamp } = chunk;

  // Only the known speaker UIDs (client=1001, consultant=2001) are valid —
  // the STT bot (9001) never appears as a "speaker" in recognize results.
  if (uid !== 1001 && uid !== 2001) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Unrecognized speaker uid');
  }

  const speakerRole = uid === 1001 ? 'user' : 'consultant';
  const chunkTimestamp = new Date(timestamp);

  const socketPayload = {
    consultationId: session.consultation.toString(),
    speakerUid: uid,
    speakerRole,
    text,
    isFinal,
    timestamp: chunkTimestamp,
  };

  // 1. Live captions: broadcast every chunk (interim + final) to the
  // consultation room so both participants receive it regardless of socket
  // reconnections (room-based, not fragile userId→socketId map lookups).
  socketHelper.emitToRoom(
    `consultation:${session.consultation.toString()}`,
    'transcript:new',
    socketPayload,
  );

  // 2. History: persist only finalized chunks. Both participants receive and
  // relay the same data-stream message, so de-dupe on the natural key before
  // writing to avoid double entries in the saved transcript.
  if (isFinal) {
    const exists = await Transcript.findOne({
      consultation: session.consultation,
      speakerUid: uid,
      text,
      timestamp: chunkTimestamp,
    });

    if (!exists) {
      await Transcript.create({
        consultation: session.consultation,
        channelName: session.channelName,
        speakerUid: uid,
        speakerRole,
        text,
        isFinal,
        timestamp: chunkTimestamp,
      });
    }
  }
};

const getTranscriptHistory = async (consultationId: string) => {
  return await Transcript.find({ consultation: consultationId }).sort({
    timestamp: 1,
  });
};

export const TranscriptionService = {
  startTranscription,
  stopTranscription,
  ingestTranscriptChunk,
  getTranscriptHistory,
};
