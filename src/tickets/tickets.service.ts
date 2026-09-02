import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../users/user.entity';
import { UserRole, TicketPriority } from '../common/enums';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  QueryTicketsDto,
  TicketSortField,
  SortOrder,
} from './dto/query-tickets.dto';
import { computeDueAt } from './due-date.util';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  async create(requester: User, dto: CreateTicketDto): Promise<Ticket> {
    const priority = dto.priority ?? TicketPriority.NORMAL;
    const ticket = this.ticketsRepository.create({
      subject: dto.subject,
      body: dto.body,
      priority,
      requester,
      dueAt: computeDueAt(priority),
    });
    return this.ticketsRepository.save(ticket);
  }

  private applyVisibility(
    qb: SelectQueryBuilder<Ticket>,
    user: User,
  ): SelectQueryBuilder<Ticket> {
    if (user.role === UserRole.CUSTOMER) {
      qb.andWhere('requester.id = :userId', { userId: user.id });
    }
    return qb;
  }

  async findOneForUser(id: number, user: User): Promise<Ticket> {
    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.tags', 'tags')
      .where('ticket.id = :id', { id });
    this.applyVisibility(qb, user);
    const ticket = await qb.getOne();
    if (!ticket) {
      // Deliberately 404, never 403 — a customer must not learn the
      // ticket exists at all (Rule 2).
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async findAllForUser(
    user: User,
    query: QueryTicketsDto,
  ): Promise<{ data: Ticket[]; page: number; pageSize: number; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.tags', 'tags');

    this.applyVisibility(qb, user);

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }
    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    }
    if (query.assigneeId) {
      qb.andWhere('assignee.id = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }
    if (query.tag) {
      qb.andWhere('tags.name = :tag', { tag: query.tag });
    }
    if (query.q) {
      qb.andWhere('(ticket.subject ILIKE :q OR ticket.body ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }
    if (query.overdue) {
      qb.andWhere('ticket.dueAt < :now', { now: new Date() })
        .andWhere('ticket.status NOT IN (:...closedStatuses)', {
          closedStatuses: ['resolved', 'closed'],
        });
    }

    // total is counted before paging — clone the filtered query builder
    // and count on it, rather than counting the sliced page.
    const total = await qb.getCount();

    const sortField = query.sort ?? TicketSortField.CREATED_AT;
    const order = (query.order ?? SortOrder.DESC).toUpperCase() as
      | 'ASC'
      | 'DESC';
    qb.orderBy(`ticket.${sortField}`, order);

    qb.skip((page - 1) * pageSize).take(pageSize);

    const data = await qb.getMany();

    return { data, page, pageSize, total };
  }

  async update(
    id: number,
    user: User,
    dto: UpdateTicketDto,
  ): Promise<Ticket> {
    const ticket = await this.findOneForUser(id, user);
    if (
      user.role === UserRole.CUSTOMER &&
      ticket.requester.id !== user.id
    ) {
      throw new ForbiddenException();
    }
    Object.assign(ticket, dto);
    return this.ticketsRepository.save(ticket);
  }

  async remove(id: number, user: User): Promise<void> {
    const ticket = await this.findOneForUser(id, user);
    await this.ticketsRepository.remove(ticket);
  }
}