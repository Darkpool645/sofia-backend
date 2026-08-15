import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AttendanceRecordDto {
  @IsString()
  @MinLength(1)
  studentId!: string;

  @IsIn(['PRESENTE', 'AUSENTE', 'RETARDO'])
  status!: string;
}

export class SaveAttendanceDto {
  @IsString()
  @MinLength(1)
  classId!: string;

  // Fecha del pase de lista "YYYY-MM-DD". Si se omite, se usa hoy.
  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}