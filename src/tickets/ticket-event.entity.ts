import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../users/user.entity';
import { TicketStatus } from '../common/enums';

@Entity('ticket_events')
export class TicketEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.events, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @ManyToOne(() => User, (user) => user.events, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: TicketStatus,
    nullable: true,
  })
  fromStatus: TicketStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: TicketStatus })
  toStatus: TicketStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}