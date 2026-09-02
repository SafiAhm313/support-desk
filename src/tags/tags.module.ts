import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tag]), AuthModule],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}