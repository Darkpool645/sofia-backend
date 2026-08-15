import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { SaveAttendanceDto } from './dto/save-attendance.dto';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  // GET /api/attendance/roster?classId=...&date=YYYY-MM-DD
  @Roles('PROFESOR')
  @Get('roster')
  roster(
    @CurrentUser() user: any,
    @Query('classId') classId: string,
    @Query('date') date?: string,
  ) {
    return this.service.roster(user.id, classId, date);
  }

  @Roles('PROFESOR')
  @Post()
  save(@CurrentUser() user: any, @Body() dto: SaveAttendanceDto) {
    return this.service.save(user.id, dto);
  }
}