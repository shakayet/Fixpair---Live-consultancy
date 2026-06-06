/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable no-undef */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { Consultation } from '../consultation/consultation.model';
import { VideoSession } from './videoSession.model';
import { IVideoSession } from './videoSession.interface';
import { generateAgoraToken } from '../../../helpers/agoraTokenHelper';

const createSession = async (user: JwtPayload, consultationId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Consultation not found');
  }

  // Verify that the user is part of the consultation
  if (
    consultation.user.toString() !== user.id &&
    consultation.consultant.toString() !== user.id
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not part of this consultation',
    );
  }

  // Check if a session already exists for this consultation
  const existingSession = await VideoSession.findOne({
    consultation: consultationId,
  });
  if (existingSession) {
    if (existingSession.status === 'ended') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This consultation session has already ended',
      );
    }
    return existingSession;
  }

  const channelName = `consultation_${consultationId}`;
  // User UID: 1001, Consultant UID: 2001 as per requirement
  const uid = user.role === 'USER' ? 1001 : 2001;
  const token = generateAgoraToken(channelName, uid);

  const sessionData: Partial<IVideoSession> = {
    consultation: new mongoose.Types.ObjectId(consultationId),
    user: consultation.user,
    consultant: consultation.consultant,
    channelName,
    token,
    status: 'pending',
  };

  const result = await VideoSession.create(sessionData);

  // --- Real-time Signaling ---
  const recipientId =
    user.role === 'USER'
      ? consultation.consultant.toString()
      : consultation.user.toString();

  const recipient = await User.findById(recipientId);
  if (!recipient) return result;

  const signalingData = {
    sessionId: result._id.toString(),
    callerName: user.name || 'A user',
    callerAvatar: user.image || user.avatar || '',
    appId: config.agora.appId,
    token: result.token,
    channelName: result.channelName,
  };

  if (recipient.role === 'CONSULTANT') {
    // Case 1: Recipient is Web Consultant (Socket)
    socketHelper.emitToUser(recipientId, 'incoming-call', {
      ...signalingData,
      uid: 2001,
    });
  } else if (recipient.role === 'USER') {
    // Case 2: Recipient is Mobile Client (FCM)
    if (recipient.fcmTokens && recipient.fcmTokens.length > 0) {
      await NotificationHelper.sendPushNotification(recipient.fcmTokens, {
        type: 'INCOMING_CALL',
        ...signalingData,
        uid: '1001', // FCM data must be strings
      }).catch(err => console.error('FCM Error in session creation:', err));
    }
  }

  return { ...result.toObject(), uid };
};

import { BillingService } from '../payment/billing.service';
import { InvoiceService } from '../payment/invoice.service';
import { NotificationHelper } from '../../../helpers/notification/notificationHelper';
import { socketHelper } from '../../../helpers/socketHelper';
import { User } from '../user/user.model';
import { TranscriptionService } from '../transcription/transcription.service';

const joinSession = async (user: JwtPayload, sessionId: string) => {
  const session = await VideoSession.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video session not found');
  }

  if (session.status === 'ended') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This session has already ended',
    );
  }

  // Verify that the user is part of the session
  if (
    session.user.toString() !== user.id &&
    session.consultant.toString() !== user.id
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not part of this session',
    );
  }

  // Update status to ongoing if it's the first time joining
  if (session.status === 'pending') {
    // Atomic update to prevent race conditions when both users join simultaneously
    const updatedSession = await VideoSession.findOneAndUpdate(
      { _id: sessionId, status: 'pending' },
      { status: 'ongoing', startedAt: new Date() },
      { new: true },
    );

    if (updatedSession) {
      // 1. Trigger billing first (this includes the 5-minute pre-auth check)
      try {
        await BillingService.startBilling(session.consultation.toString());
      } catch (error) {
        // If billing fails, revert status so it can be retried
        await VideoSession.updateOne({ _id: sessionId }, { status: 'pending' });
        throw error;
      }

      // 2. Start Transcription
      try {
        await TranscriptionService.startTranscription(
          session.consultation.toString(),
        );
      } catch (error) {
        console.error('Failed to start transcription:', error);
        // We don't want to block the session if STT fails
      }
    }
  }

  // Add the assigned UID to the response for the frontend
  const uid = user.role === 'USER' ? 1001 : 2001;

  return {
    ...session.toObject(),
    uid,
    appId: config.agora.appId,
  };
};

const endSession = async (user: JwtPayload, sessionId: string) => {
  const session = await VideoSession.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video session not found');
  }

  if (session.status === 'ended') {
    return session;
  }

  // Verify that the user is part of the session
  if (
    session.user.toString() !== user.id &&
    session.consultant.toString() !== user.id
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to end this session',
    );
  }

  const endedAt = new Date();
  session.status = 'ended';
  session.endedAt = endedAt;

  if (session.startedAt) {
    // Calculate duration in seconds
    const duration = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );
    session.duration = duration;
  }

  await session.save();

  // Stop transcription
  try {
    await TranscriptionService.stopTranscription(
      session.consultation.toString(),
    );
  } catch (error) {
    console.error('Failed to stop transcription:', error);
  }

  // Stop billing and generate invoice
  BillingService.stopBilling(session.consultation.toString());
  await InvoiceService.finalizeInvoice(session.consultation.toString());

  return session;
};

const getMySessions = async (user: JwtPayload) => {
  const filter: any = {};
  if (user.role === 'USER') {
    filter.user = user.id;
  } else if (user.role === 'CONSULTANT') {
    filter.consultant = user.id;
  }

  const result = await VideoSession.find(filter)
    .populate([
      { path: 'user', select: 'name image avatar' },
      { path: 'consultant', select: 'name image avatar' },
      { path: 'consultation' },
    ])
    .sort({ createdAt: -1 });

  return result;
};

const handleCallAction = async (
  user: JwtPayload,
  sessionId: string,
  action: 'REJECT' | 'CANCEL',
) => {
  const session = await VideoSession.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const recipientId =
    user.id === session.user.toString()
      ? session.consultant.toString()
      : session.user.toString();

  const recipient = await User.findById(recipientId);

  if (action === 'REJECT') {
    // Recipient rejected the call
    session.status = 'ended';
    await session.save();

    // Notify the caller
    socketHelper.emitToUser(recipientId, 'call-rejected', { sessionId });
    if (recipient?.fcmTokens && recipient.fcmTokens.length > 0) {
      await NotificationHelper.sendPushNotification(recipient.fcmTokens, {
        type: 'CALL_REJECTED',
        sessionId,
      }).catch(err => console.error('FCM Error in REJECT:', err));
    }
  } else if (action === 'CANCEL') {
    // Caller cancelled the call
    session.status = 'ended';
    await session.save();

    // Notify the recipient
    socketHelper.emitToUser(recipientId, 'call-cancelled', { sessionId });
    if (recipient?.fcmTokens && recipient.fcmTokens.length > 0) {
      await NotificationHelper.sendPushNotification(recipient.fcmTokens, {
        type: 'CALL_CANCELLED',
        sessionId,
      }).catch(err => console.error('FCM Error in CANCEL:', err));
    }
  }

  return { success: true };
};

export const VideoSessionService = {
  createSession,
  joinSession,
  endSession,
  getMySessions,
  handleCallAction,
};
