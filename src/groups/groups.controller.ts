import { Body, Controller, Get, Post } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto }  from './dto/create-group.dto';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('groups')
export class GroupsController {
    constructor(private service: GroupsService) {}

    @Roles('ADMIN')
    @Post()
    create(@CurrentUser() user: any, @Body() dto: CreateGroupDto) {
        return this.service.create(user.id, dto);
    }

    @Roles('ADMIN', 'SUPERADMIN')
    @Get()
    findAll() {
        return this.service.findAll();
    }
}