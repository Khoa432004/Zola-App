import { Request, Response } from 'express';
import { triggerMemoryPostsManually } from '../cron/memory-posts.cron';

export class CronController {
  /**
   * Manually trigger memory posts generation (for testing)
   * POST /api/cron/trigger-memory-posts
   */
  static async triggerMemoryPosts(req: Request, res: Response) {
    try {
      console.log(`🔧 [CRON CONTROLLER] Manual trigger requested by user`);

      const result = await triggerMemoryPostsManually();

      return res.status(200).json({
        success: true,
        message: 'Memory posts generation completed',
        data: result,
      });
    } catch (error: any) {
      console.error(`❌ [CRON CONTROLLER] Error:`, error?.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate memory posts',
        error: error?.message,
      });
    }
  }
}
