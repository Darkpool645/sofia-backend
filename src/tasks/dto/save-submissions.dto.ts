import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SubmissionRecordDto {
  @IsString()
  @MinLength(1)
  studentId!: string;

  @IsBoolean()
  delivered!: boolean;

  // Calificación 0–10 (opcional; null si no entregó o aún sin calificar).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  grade?: number;
}

export class SaveSubmissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmissionRecordDto)
  records!: SubmissionRecordDto[];
}