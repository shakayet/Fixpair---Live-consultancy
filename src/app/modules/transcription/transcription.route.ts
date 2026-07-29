import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { TranscriptionController } from './transcription.controller';

const router = express.Router();

// Start transcription
router.post(
  '/start',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.startTranscription,
);

router.post(
  '/:consultationId/start',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.startTranscription,
);

// Stop transcription
router.post(
  '/stop',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.stopTranscription,
);

router.post(
  '/:consultationId/stop',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.stopTranscription,
);

// Get history
router.get(
  '/history',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.getTranscriptHistory,
);

router.get(
  '/:consultationId/history',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.getTranscriptHistory,
);

// Live caption relay: the STT bot (UID 9001) publishes recognized text as an
// RTC data-stream message inside the channel, which only connected clients can
// receive. A participant's client forwards each chunk here so the backend can
// persist finalized transcripts and re-broadcast them (e.g. to a web dashboard
// that isn't joined to the RTC channel) over Socket.IO.
router.post(
  '/:consultationId/ingest',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.ingestTranscript,
);

export const TranscriptionRoutes = router;
