import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}