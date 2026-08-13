import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateSchoolYearDto {
    @IsString()
    @MinLength(4)
    name!: string;

    @IsDateString()
    startDate!: string;

    @IsDateString()
    endDate!: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}