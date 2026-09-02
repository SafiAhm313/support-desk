import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), AuthModule, TicketsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}