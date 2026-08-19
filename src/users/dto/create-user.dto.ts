import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @MinLength(2)
    name!: string;

    @IsString()
    @MinLength(3)
    username!: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsIn(['ADMIN', 'PROFESOR','PADRE'])
    role!: string;
}