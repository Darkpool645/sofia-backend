import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';

@Injectable()
export class SchoolYearsService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditService,
    ) {}

    async create(creatorId: string, dto: CreateSchoolYearDto) {
        const exists = await this.prisma.schoolYear.findUnique({
            where: { name: dto.name },
        });
        if (exists) throw new ConflictException('Ya existe un ciclo con ese nombre.');

        const cycle = await this.prisma.schoolYear.create({
            data: {
                name: dto.name,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                active: dto.active ?? false,
            },
        });

        await this.audit.log({
            level: 'INFO',
            action: 'schoolyear.create',
            actorId: creatorId,
            message: `Creó el ciclo ${cycle.name}`,
        });

        return cycle;
    }

    findAll() {
        return this.prisma.schoolYear.findMany({
            orderBy: { startDate: 'desc' },
        });
    }
}