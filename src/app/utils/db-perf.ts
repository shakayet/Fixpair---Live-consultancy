import { logger } from '../../shared/logger';

/**
 * Database Performance Monitor
 */
export const monitorDB = async <T>(operationName: string, queryFn: () => Promise<T>): Promise<T> => {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    if (duration > 100) {
      logger.warn(`[DB PERF] SLOW: ${operationName} took ${duration}ms`);
    } else {
      logger.info(`[DB PERF] ${operationName} took ${duration}ms`);
    }
    return result;
  } catch (error) {
    logger.error(`[DB PERF] ERROR in ${operationName}:`, error);
    throw error;
  }
};
