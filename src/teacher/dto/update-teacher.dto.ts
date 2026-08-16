import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateAssignmentDto {
  // Si viene id, es un ClassSlot existente (se actualiza).
  // Si no viene, es una asignación nueva (se crea).
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  groupId!: string;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime debe ser HH:MM' })
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime debe ser HH:MM' })
  endTime!: string;
}

export class UpdateTeacherDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  // Opcional: solo si se quiere cambiar la contraseña.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  // Lista COMPLETA deseada de asignaciones (el backend hace el diff).
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAssignmentDto)
  assignments!: UpdateAssignmentDto[];
}