import cron from 'node-cron';
import prisma from '../utils/prisma';
import { emailService } from './emailService';

export function scheduleCronJobs() {
  // Monthly reminder on the 1st of each month at 9:00 AM
  cron.schedule('0 9 1 * *', async () => {
    try {
      const activeCardHolders = await prisma.user.findMany({
        where: {
          deletedAt: null,
          cards: { some: { status: 'ACTIVE' } },
        },
        select: { email: true, name: true },
      });

      await emailService.monthlyReminder(activeCardHolders);
      console.log(`Monthly reminder sent to ${activeCardHolders.length} card holders`);
    } catch (error) {
      console.error('Failed to send monthly reminders:', error);
    }
  });

  console.log('Cron jobs scheduled');
}
