import os from 'os';
import { cacheHelper } from './cache';

/**
 * System Monitoring Utility
 */
export const getSystemMetrics = () => {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;

  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  const processMetrics = {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
  };

  return {
    os: {
      platform: os.platform(),
      release: os.release(),
      uptime: os.uptime(),
      loadAvg,
      memory: {
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usage: `${memUsage.toFixed(2)}%`,
      },
      cpus: cpus.length,
    },
    process: {
      pid: process.pid,
      uptime: `${processMetrics.uptime.toFixed(2)}s`,
      memory: {
        rss: `${(processMetrics.memory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(processMetrics.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(processMetrics.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
    },
    cache: cacheHelper.getStats(),
  };
};
