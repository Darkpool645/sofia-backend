import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { Roles, CurrentUser } from '../auth/decorators';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

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

    @Roles('ADMIN')
    @Get(':id')
    findOne(@Param('id') id:string) {
        return this.service.findOne(id);
    }

    @Roles('ADMIN')
    @Patch(':id')
    update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateTeacherDto,
    ) {
        return this.service.update(user.id, id, dto);
    }
}