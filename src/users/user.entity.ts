import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Ticket } from '../tickets/ticket.entity';
import { Comment } from '../comments/comment.entity';
import { TicketEvent } from '../tickets/ticket-event.entity';
import { UserRole } from '../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', name: 'full_name' })
  fullName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.requester)
  ticketsRequested: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.assignee)
  ticketsAssigned: Ticket[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @OneToMany(() => TicketEvent, (event) => event.actor)
  events: TicketEvent[];
}