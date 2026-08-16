import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Roles, CurrentUser } from '../auth/decorators';
import { SaveSubmissionsDto } from './dto/save-submissions.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) { }

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

  @Roles('PROFESOR')
  @Get(':id/submissions')
  getSubmissions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getSubmissions(user.id, id);
  }

  @Roles('PROFESOR')
  @Post(':id/submissions')
  saveSubmissions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SaveSubmissionsDto,
  ) {
    return this.service.saveSubmissions(user.id, id, dto);
  }

  @Roles('PROFESOR')
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.service.update(user.id, id, dto);
  }
}