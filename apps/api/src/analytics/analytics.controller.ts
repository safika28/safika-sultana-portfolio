import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  @Get('dashboard')
  @ApiOperation({ summary: 'Retrieve analytics collection availability' })
  getDashboard() {
    return {
      overview: null,
      trend: [],
      lastUpdated: null,
      source: 'unconfigured',
      message: 'Visitor analytics collection has not been configured. Public portfolio analytics use GitHub repository metadata and published CMS records.'
    };
  }
}
