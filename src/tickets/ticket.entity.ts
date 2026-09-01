import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';
import { Tag } from '../tags/tag.entity';
import { TicketEvent } from './ticket-event.entity';
import { TicketStatus, TicketPriority } from '../common/enums';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.NORMAL,
  })
  priority: TicketPriority;

  @ManyToOne(() => User, (user) => user.ticketsRequested, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @ManyToOne(() => User, (user) => user.ticketsAssigned, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User | null;

  @Column({ name: 'due_at', type: 'timestamptz' })
  dueAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.ticket)
  comments: Comment[];

  @OneToMany(() => TicketEvent, (event) => event.ticket)
  events: TicketEvent[];

  @ManyToMany(() => Tag, (tag) => tag.tickets)
  @JoinTable({
  name: 'ticket_tags',
  joinColumn: {
    name: 'ticket_id',
    referencedColumnName: 'id',
  },
  inverseJoinColumn: {
    name: 'tag_id',
    referencedColumnName: 'id',
  },
})
  tags: Tag[];
}