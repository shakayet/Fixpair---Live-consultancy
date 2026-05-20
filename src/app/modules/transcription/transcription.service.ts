/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
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

  // 1. Acquire resource
  const resourceId = await AgoraSttHelper.acquireResource(
    session.channelName,
    '9001',
  );

  // 2. Start transcription
  // We need a token for the STT agent (UID 9001)
  const sttToken = generateAgoraToken(session.channelName, 9001);

  const taskId = await AgoraSttHelper.startTranscription(
    resourceId,
    session.channelName,
    sttToken,
  );

  // 3. Update session with STT info
  await VideoSession.findByIdAndUpdate(session._id, {
    $set: {
      sttResourceId: resourceId,
      sttTaskId: taskId,
      isTranscriptionActive: true,
    },
  });

  return { taskId, resourceId };
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

const handleTranscriptionCallback = async (payload: any) => {
  // Agora STT callback structure processing
  // This is where we receive the live text from Agora's message push
  const { channelName, text, uid, isFinal, timestamp } = payload;

  const session = await VideoSession.findOne({ channelName });
  if (!session) return;

  const speakerRole = uid === 1001 ? 'user' : 'consultant';

  // 1. Save to DB
  const transcriptData = {
    consultation: session.consultation,
    channelName,
    speakerUid: uid,
    speakerRole,
    text,
    isFinal,
    timestamp: new Date(timestamp),
  };

  await Transcript.create(transcriptData);

  // 2. Broadcast via Socket
  const socketPayload = {
    consultationId: session.consultation.toString(),
    speakerUid: uid,
    speakerRole,
    text,
    isFinal,
    timestamp: new Date(timestamp),
  };

  // Broadcast to both user and consultant
  socketHelper.emitToUser(
    session.user.toString(),
    'transcript:new',
    socketPayload,
  );
  socketHelper.emitToUser(
    session.consultant.toString(),
    'transcript:new',
    socketPayload,
  );
};

const getTranscriptHistory = async (consultationId: string) => {
  return await Transcript.find({ consultation: consultationId }).sort({
    timestamp: 1,
  });
};

export const TranscriptionService = {
  startTranscription,
  stopTranscription,
  handleTranscriptionCallback,
  getTranscriptHistory,
};
