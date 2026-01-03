import cron from 'node-cron';
import { MemoryService } from '../services/memory.service';

/**
 * Cron Job để tự động tạo Memory Posts mỗi ngày
 * Chạy vào 00:00 (midnight) mỗi ngày
 * 
 * Cron Expression: '0 0 * * *'
 * - Minute: 0
 * - Hour: 0
 * - Day of Month: * (every day)
 * - Month: * (every month)
 * - Day of Week: * (every day of week)
 */

export function initMemoryPostsCronJob() {
  const memoryService = new MemoryService();

  // Schedule: Chạy mỗi ngày lúc 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log(`🕐 [CRON JOB] Memory Posts generation started at ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    try {
      const result = await memoryService.createMemoryPostsForToday();
      
      console.log('');
      console.log('='.repeat(80));
      console.log(`✅ [CRON JOB] Memory Posts generation completed`);
      console.log(`   Posts created: ${result.postsCreated}`);
      console.log(`   Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log(`   Error details:`);
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
      
      console.log('='.repeat(80));
      console.log('');
    } catch (error: any) {
      console.error('');
      console.error('='.repeat(80));
      console.error(`❌ [CRON JOB] Fatal error in Memory Posts generation:`, error?.message);
      console.error('='.repeat(80));
      console.error('');
    }
  });

  console.log('✅ [CRON] Memory Posts cron job initialized (runs daily at 00:00)');
}

/**
 * Manual trigger function for testing (gọi qua API)
 */
export async function triggerMemoryPostsManually(): Promise<any> {
  console.log('');
  console.log('='.repeat(80));
  console.log(`🔧 [MANUAL TRIGGER] Memory Posts generation started at ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  const memoryService = new MemoryService();
  const result = await memoryService.createMemoryPostsForToday();

  console.log('');
  console.log('='.repeat(80));
  console.log(`✅ [MANUAL TRIGGER] Memory Posts generation completed`);
  console.log(`   Posts created: ${result.postsCreated}`);
  console.log(`   Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log(`   Error details:`);
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  console.log('='.repeat(80));
  console.log('');

  return result;
}
