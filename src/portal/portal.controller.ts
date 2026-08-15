import { Controller, Get } from '@nestjs/common';
import { PortalService } from './portal.service';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('me')
export class PortalController {
  constructor(private service: PortalService) {}

  @Roles('PROFESOR')
  @Get('classes')
  myClasses(@CurrentUser() user: any) {
    return this.service.myClasses(user.id);
  }
}