/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import cron from 'node-cron';
import { ConsultationService } from '../modules/consultation/consultation.service';
import { NotificationService } from '../modules/notification/notification.service';
import { Consultation } from '../modules/consultation/consultation.model';
import { logger } from '../../shared/logger';

const cronJobs = () => {
  // Run every hour to check for consultation reminders
  cron.schedule('0 * * * *', async () => {
    logger.info('Running cron job: consultationReminders');
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 1. Find consultations starting in approximately 1 hour
      const oneHourReminders = await Consultation.find({
        status: { $in: ['accepted', 'confirmed'] },
        date: {
          $gte: new Date(oneHourLater.getTime() - 30 * 60 * 1000), // window of 30 mins
          $lte: new Date(oneHourLater.getTime() + 30 * 60 * 1000),
        },
        'remindersSent.oneHour': false,
      }).populate('consultant');

      for (const consultation of oneHourReminders) {
        const consultantName = (consultation.consultant as any).name;
        await NotificationService.sendNotification({
          user: consultation.user.toString(),
          title: 'Consultation Reminder',
          message: `Reminder: Your consultation with ${consultantName} starts in 1 hour.`,
          type: 'CONSULTATION_REMINDER',
          relatedBooking: consultation._id.toString(),
          metadata: {
            consultantName,
            reminderType: '1_hour_reminder',
            startTime: consultation.startTime,
          },
        });
        consultation.remindersSent!.oneHour = true;
        await consultation.save();
      }

      // 2. Find consultations starting in approximately 24 hours
      const twentyFourHourReminders = await Consultation.find({
        status: { $in: ['accepted', 'confirmed'] },
        date: {
          $gte: new Date(twentyFourHoursLater.getTime() - 30 * 60 * 1000),
          $lte: new Date(twentyFourHoursLater.getTime() + 30 * 60 * 1000),
        },
        'remindersSent.twentyFourHour': false,
      }).populate('consultant');

      for (const consultation of twentyFourHourReminders) {
        const consultantName = (consultation.consultant as any).name;
        await NotificationService.sendNotification({
          user: consultation.user.toString(),
          title: 'Consultation Reminder',
          message: `Reminder: Your consultation with ${consultantName} starts in 24 hours.`,
          type: 'CONSULTATION_REMINDER',
          relatedBooking: consultation._id.toString(),
          metadata: {
            consultantName,
            reminderType: '24_hour_reminder',
            startTime: consultation.startTime,
          },
        });
        consultation.remindersSent!.twentyFourHour = true;
        await consultation.save();
      }

      logger.info('Cron job completed: consultationReminders');
    } catch (error) {
      logger.error('Cron job failed: consultationReminders', error);
    }
  });
};

export default cronJobs;
