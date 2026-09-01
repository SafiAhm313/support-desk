import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @ManyToMany(() => Ticket, (ticket) => ticket.tags)
  tickets: Ticket[];
}