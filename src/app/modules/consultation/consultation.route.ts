import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ConsultationController } from './consultation.controller';
import { ConsultationValidation } from './consultation.validation';
import { TranscriptionController } from '../transcription/transcription.controller';

const router = express.Router();

// Transcription sub-routes
router.post(
  '/transcription/start',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.startTranscription,
);

router.post(
  '/:consultationId/transcription/start',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.startTranscription,
);

router.post(
  '/transcription/stop',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.stopTranscription,
);

router.post(
  '/:consultationId/transcription/stop',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.stopTranscription,
);

router.get(
  '/transcription/history',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.getTranscriptHistory,
);

router.get(
  '/:consultationId/transcription/history',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  TranscriptionController.getTranscriptHistory,
);

// Consultant: Manage unavailable slots
router.post(
  '/availability',
  auth(USER_ROLES.CONSULTANT),
  validateRequest(ConsultationValidation.setAvailabilityZodSchema),
  ConsultationController.setAvailability,
);

// User: View unavailable and booked slots for a consultant
router.get(
  '/available-slots/:consultantId',
  validateRequest(ConsultationValidation.getAvailableSlotsZodSchema),
  ConsultationController.getAvailableSlots,
);

// User: Book a consultation
router.post(
  '/book',
  auth(USER_ROLES.USER),
  validateRequest(ConsultationValidation.createBookingZodSchema),
  ConsultationController.createBooking,
);

// User/Consultant: View their bookings
router.get(
  '/my-bookings',
  auth(
    USER_ROLES.USER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  ConsultationController.getMyBookings,
);

// Consultant/Admin: Update booking status
router.patch(
  '/status/:id',
  auth(USER_ROLES.CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(ConsultationValidation.updateBookingStatusZodSchema),
  ConsultationController.updateBookingStatus,
);

// User: Reschedule a booking
router.patch(
  '/reschedule/:id',
  auth(USER_ROLES.USER),
  validateRequest(ConsultationValidation.rescheduleBookingZodSchema),
  ConsultationController.rescheduleBooking,
);

// User: Cancel a booking
router.patch(
  '/cancel/:id',
  auth(USER_ROLES.USER),
  validateRequest(ConsultationValidation.cancelBookingZodSchema),
  ConsultationController.cancelBooking,
);

// Get total completed consultations for a specific consultant
router.get(
  '/consultants/:consultantId/total-consultations',
  ConsultationController.getConsultantTotalConsultations,
);

export const ConsultationRoutes = router;
