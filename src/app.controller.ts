import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    let databaseStatus: 'ok' | 'unreachable' = 'ok';

    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      databaseStatus = 'unreachable';
    }

    return {
      status: 'ok',
      database: databaseStatus,
      nodeEnv: process.env.NODE_ENV ?? 'unset',
      timestamp: new Date().toISOString(),
    };
  }
}
