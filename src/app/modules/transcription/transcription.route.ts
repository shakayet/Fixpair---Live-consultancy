import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { TranscriptionController } from './transcription.controller';

const router = express.Router();

// Start transcription
router.post(
  '/:consultationId/start',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN),
  TranscriptionController.startTranscription,
);

// Stop transcription
router.post(
  '/:consultationId/stop',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN),
  TranscriptionController.stopTranscription,
);

// Get history
router.get(
  '/:consultationId/history',
  auth(USER_ROLES.USER, USER_ROLES.CONSULTANT, USER_ROLES.ADMIN),
  TranscriptionController.getTranscriptHistory,
);

// Agora Callback (No auth needed, or secret based auth)
router.post('/callback', TranscriptionController.handleCallback);

export const TranscriptionRoutes = router;
