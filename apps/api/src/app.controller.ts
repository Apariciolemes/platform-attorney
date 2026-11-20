import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'up' })
  database: string;
}

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  @ApiOperation({ summary: 'Verifica se a API e o banco estão no ar' })
  @ApiOkResponse({ type: HealthResponseDto })
  async health(): Promise<HealthResponseDto> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'up' };
  }
}
