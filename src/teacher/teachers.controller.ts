import { Body, Controller, Get, Post } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('teachers')
export class TeachersController {
    constructor (private service: TeachersService ) {}

    @Roles('ADMIN')
    @Post()
    create(@CurrentUser() user: any, @Body() dto: CreateTeacherDto) {
        return this.service.create(user.id, dto);
    }

    @Roles('ADMIN')
    @Get()
    findAll() {
        return this.service.findAll();
    }
}