import cron from 'node-cron';
import { ConsultationService } from '../modules/consultation/consultation.service';
import { logger } from '../../shared/logger';

const cronJobs = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running cron job: deleteExpiredSlots');
    try {
      await ConsultationService.deleteExpiredSlots();
      logger.info('Cron job completed: deleteExpiredSlots');
    } catch (error) {
      logger.error('Cron job failed: deleteExpiredSlots', error);
    }
  });
};

export default cronJobs;
