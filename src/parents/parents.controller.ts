import { Body, Controller, Get, Post } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('parents')
export class ParentsController {
  constructor(private service: ParentsService) {}

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateParentDto) {
    return this.service.create(user.id, dto);
  }

  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.service.findAll();
  }
}