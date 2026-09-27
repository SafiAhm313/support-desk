import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './users/user.entity';
import { Ticket } from './tickets/ticket.entity';
import { TicketEvent } from './tickets/ticket-event.entity';
import { Comment } from './comments/comment.entity';
import { Tag } from './tags/tag.entity';
import { LoginAttempt } from './auth/login-attempt.entity';
import { databaseConnection } from './database.config';

config();

export const AppDataSource = new DataSource({
  ...databaseConnection(),
  entities: [User, Ticket, TicketEvent, Comment, Tag, LoginAttempt],
  migrations: ['src/migrations/*.ts'],
});
