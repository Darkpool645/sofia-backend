import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateNested} from 'class-validator';

export class AssignmentDto {
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

export class CreateTeacherDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsString()
    @MinLength(3)
    username!: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssignmentDto)
    assignments?: AssignmentDto[];
}