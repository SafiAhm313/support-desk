import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums';
import { TicketsService } from '../tickets/tickets.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    private readonly ticketsService: TicketsService,
  ) {}

  async create(
    ticketId: number,
    author: User,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    // Confirms the ticket exists and is visible to this user — 404 if not.
    await this.ticketsService.findOneForUser(ticketId, author);

    const isInternal = dto.isInternal ?? false;
    if (isInternal && author.role === UserRole.CUSTOMER) {
      throw new ForbiddenException(
        'Only an agent or admin may create an internal comment',
      );
    }

    const comment = this.commentsRepository.create({
      ticket: { id: ticketId } as any,
      author,
      body: dto.body,
      isInternal,
    });
    return this.commentsRepository.save(comment);
  }

  async findAllForTicket(ticketId: number, user: User): Promise<Comment[]> {
    await this.ticketsService.findOneForUser(ticketId, user);

    const comments = await this.commentsRepository.find({
      where: { ticket: { id: ticketId } },
      relations: { author: true },
      order: { createdAt: 'ASC' },
    });

    if (user.role === UserRole.CUSTOMER) {
      // A customer never receives an internal comment, even filtered
      // client-side — it's excluded before the response is built.
      return comments.filter((c) => !c.isInternal);
    }
    return comments;
  }
}