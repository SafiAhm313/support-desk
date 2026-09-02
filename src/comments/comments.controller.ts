import { Controller, Post, Get, Param, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { Request } from 'express';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@UseGuards(JwtAuthGuard)
@Controller('tickets/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Param('id', ParseIntPipe) ticketId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(ticketId, req.user, dto);
  }

  @Get()
  findAll(
    @Param('id', ParseIntPipe) ticketId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commentsService.findAllForTicket(ticketId, req.user);
  }
}