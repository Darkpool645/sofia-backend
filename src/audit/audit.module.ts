import { Controller, Get, Global, Module, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators';

@Controller('audit')
class AuditController {
    constructor(private audit: AuditService) {}

    @Roles('SUPERADMIN')
    @Get('logs')
    logs(@Query('level') level?: string, @Query('take') take?: string) {
        return this.audit.find({
            level,
            take: take ? Number(take) : undefined,
        });
    }
}

@Global()
@Module({
    controllers: [AuditController],
    providers: [AuditService],
    exports: [AuditService],
})

export class AuditModule {}