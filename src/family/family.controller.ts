import { Controller, Get, Query } from '@nestjs/common';
import { FamilyService } from './family.service';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('me')
export class FamilyController {
  constructor(private service: FamilyService) {}

  @Roles('PADRE')
  @Get('children')
  children(@CurrentUser() user: any) {
    return this.service.children(user.id);
  }

  // GET /api/me/feed?childId=...
  @Roles('PADRE')
  @Get('feed')
  feed(@CurrentUser() user: any, @Query('childId') childId: string) {
    return this.service.feed(user.id, childId);
  }
}