import { Body, Controller, Get, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Roles('PROFESOR')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTaskDto) {
    return this.service.create(user.id, dto);
  }

  @Roles('PROFESOR')
  @Get('mine')
  mine(@CurrentUser() user: any) {
    return this.service.findMine(user.id);
  }
}