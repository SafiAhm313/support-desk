import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TicketStatus } from '../../common/enums';

export class ChangeStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string;
}