import { Body, Controller, Get, Post } from '@nestjs/common';
import { SchoolYearsService } from './school-years.service';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('school-years')
export class SchoolYearsController {
    constructor(private service: SchoolYearsService) {}

    @Roles('ADMIN')
    @Post()
    create(@CurrentUser() user: any, @Body() dto: CreateSchoolYearDto) {
        return this.service.create(user.id, dto);
    }

    @Roles('ADMIN')
    @Get()
    findAll() {
        return this.service.findAll();
    }
}