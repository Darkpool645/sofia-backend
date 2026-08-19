import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

/// Un hijo = un Student: nombre del alumno + grupo al que pertenece.
export class ChildDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  groupId!: string;
}

export class CreateParentDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  // Un padre puede tener varios hijos (opcional: se pueden agregar después).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChildDto)
  children?: ChildDto[];
}