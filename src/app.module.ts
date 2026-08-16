import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { AuditInterceptor, AllExceptionsFilter } from './audit/audit.telemetry';
import { ConfigModule } from "@nestjs/config";
import { SchoolYearsModule } from "./school-years/school-years.module";
import { GroupsModule } from "./groups/groups.module";
import { TeachersModule } from "./teacher/teachers.module";
import { ParentsModule } from "./parents/parents.module";
import { TasksModule } from "./tasks/tasks.module";
import { PortalModule } from "./portal/portal.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { FamilyModule } from "./family/family.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, 
    AuthModule, 
    UsersModule, 
    AuditModule,
    SchoolYearsModule,
    GroupsModule,
    TeachersModule,
    ParentsModule,
    TasksModule,
    PortalModule,
    AttendanceModule,
    FamilyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter }, 
  ],
})

export class AppModule{}