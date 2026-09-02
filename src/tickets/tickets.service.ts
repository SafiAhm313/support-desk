import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketEvent } from './ticket-event.entity';
import { Tag } from '../tags/tag.entity';
import { User } from '../users/user.entity';
import { UserRole, TicketPriority, TicketStatus } from '../common/enums';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import {
  QueryTicketsDto,
  TicketSortField,
  SortOrder,
} from './dto/query-tickets.dto';
import { computeDueAt } from './due-date.util';
import { isValidTransition, requiresNoteToReopen } from './ticket-status.util';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketEvent)
    private readonly ticketEventsRepository: Repository<TicketEvent>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

  private baseQuery(): SelectQueryBuilder<Ticket> {
    return this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.tags', 'tags');
  }

  async findOneForUser(id: number, user: User): Promise<Ticket> {
    const qb = this.baseQuery().where('ticket.id = :id', { id });
    this.applyVisibility(qb, user);
    const ticket = await qb.getOne();
    if (!ticket) {
      // Deliberately 404, never 403 — a customer must not learn the
      // ticket exists at all (Rule 2).
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  // For agent/admin-only operations (assign, status, tag) where the
  // endpoint is already role-guarded, so no customer-visibility scoping
  // is needed — just existence.
  async findByIdUnscoped(id: number): Promise<Ticket> {
    const ticket = await this.baseQuery()
      .where('ticket.id = :id', { id })
      .getOne();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async findAllForUser(
    user: User,
    query: QueryTicketsDto,
  ): Promise<{
    data: Ticket[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.baseQuery();
    this.applyVisibility(qb, user);

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }
    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', {
        priority: query.priority,
      });
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
      qb.andWhere('ticket.dueAt < :now', { now: new Date() }).andWhere(
        'ticket.status NOT IN (:...closedStatuses)',
        { closedStatuses: ['resolved', 'closed'] },
      );
    }

    // total is counted before paging — count on the filtered query
    // builder before .skip()/.take() are applied.
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

  async update(id: number, user: User, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOneForUser(id, user);
    if (user.role === UserRole.CUSTOMER && ticket.requester.id !== user.id) {
      throw new ForbiddenException();
    }
    Object.assign(ticket, dto);
    return this.ticketsRepository.save(ticket);
  }

  async remove(id: number, user: User): Promise<void> {
    const ticket = await this.findOneForUser(id, user);
    await this.ticketsRepository.remove(ticket);
  }

  async assign(
    id: number,
    actor: User,
    dto: AssignTicketDto,
  ): Promise<Ticket> {
    const ticket = await this.findByIdUnscoped(id);
    const proposedAssignee = await this.usersRepository.findOne({
      where: { id: dto.assigneeId },
    });
    if (
      !proposedAssignee ||
      (proposedAssignee.role !== UserRole.AGENT &&
        proposedAssignee.role !== UserRole.ADMIN)
    ) {
      throw new UnprocessableEntityException(
        'Assignee must be an agent or admin',
      );
    }
    ticket.assignee = proposedAssignee;
    const saved = await this.ticketsRepository.save(ticket);

    const event = this.ticketEventsRepository.create({
      ticket: saved,
      actor,
      fromStatus: saved.status,
      toStatus: saved.status,
      note: `Assigned to ${proposedAssignee.email}`,
    });
    await this.ticketEventsRepository.save(event);

    return saved;
  }

  async changeStatus(
    id: number,
    actor: User,
    dto: ChangeStatusDto,
  ): Promise<Ticket> {
    const ticket = await this.findByIdUnscoped(id);
    const from = ticket.status;
    const to = dto.status;

    if (!isValidTransition(from, to)) {
      throw new ConflictException(
        `Cannot transition from ${from} to ${to}`,
      );
    }

    if (requiresNoteToReopen(from, to) && !dto.note?.trim()) {
      throw new BadRequestException(
        'A non-empty note is required to reopen a closed ticket',
      );
    }

    ticket.status = to;
    const saved = await this.ticketsRepository.save(ticket);

    const event = this.ticketEventsRepository.create({
      ticket: saved,
      actor,
      fromStatus: from,
      toStatus: to,
      note: dto.note ?? null,
    });
    await this.ticketEventsRepository.save(event);

    return saved;
  }

  async addTag(id: number, tagId: number): Promise<Ticket> {
    const ticket = await this.findByIdUnscoped(id);
    const tag = await this.tagsRepository.findOne({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    const alreadyTagged = ticket.tags.some((t) => t.id === tag.id);
    if (!alreadyTagged) {
      ticket.tags.push(tag);
      await this.ticketsRepository.save(ticket);
    }
    return this.findByIdUnscoped(id);
  }

  async removeTag(id: number, tagId: number): Promise<void> {
    const ticket = await this.findByIdUnscoped(id);
    ticket.tags = ticket.tags.filter((t) => t.id !== tagId);
    await this.ticketsRepository.save(ticket);
  }

  async findEvents(id: number, user: User): Promise<TicketEvent[]> {
    // Confirms the ticket exists and is visible to this user first —
    // reuses the same 404-not-403 visibility check as everywhere else.
    await this.findOneForUser(id, user);
    return this.ticketEventsRepository.find({
      where: { ticket: { id } },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
    });
  }
}