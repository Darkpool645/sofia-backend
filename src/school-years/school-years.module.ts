import { Module } from '@nestjs/common';
import { SchoolYearsService } from './school-years.service';
import { SchoolYearsController } from './school-years.controller';

@Module({
    controllers: [SchoolYearsController],
    providers: [SchoolYearsService],
})

export class SchoolYearsModule {}