import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate!: string; // "YYYY-MM-DD"
}