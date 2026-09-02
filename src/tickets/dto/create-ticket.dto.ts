import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { TicketPriority } from '../../common/enums';

export class CreateTicketDto {
  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}