import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('DWar')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Estado da API' })
  health() {
    return { status: 'ok', version: '0.1.0' };
  }
}
