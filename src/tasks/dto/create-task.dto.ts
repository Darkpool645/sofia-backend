import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum TaskTypeDto {
  TAREA = 'TAREA',
  ACTIVIDAD = 'ACTIVIDAD',
  EXAMEN = 'EXAMEN',
}

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskTypeDto)
  type!: TaskTypeDto;

  @IsDateString()
  dueDate!: string; // ISO: "2026-08-20"

  // Publicar en uno o varios grupos.
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  groupIds!: string[];
}