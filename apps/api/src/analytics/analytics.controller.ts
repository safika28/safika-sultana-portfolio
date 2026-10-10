import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  @Get('dashboard')
  @ApiOperation({ summary: 'Retrieve monthly analytics dashboard summary' })
  getDashboard() {
    return {
      overview: {
        pageViews: 18420,
        uniqueVisitors: 7192,
        conversionRate: 6.8,
        engagements: 3421
      },
      trend: [64, 71, 69, 83, 91, 96, 110],
      lastUpdated: '2026-10-10T00:00:00.000Z'
    };
  }
}
