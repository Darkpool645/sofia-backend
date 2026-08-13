import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditService,
    ) {}


    async create(creatorId: string, dto: CreateGroupDto) {
        const cycle = await this.prisma.schoolYear.findUnique({
            where: { id: dto.schoolYearId }
        });
        if (!cycle) throw new BadRequestException('El ciclo escolar no existe.');

        const dup = await this.prisma.group.findUnique({
            where: {
                name_schoolYearId: {
                    name: dto.name,
                    schoolYearId: dto.schoolYearId,
                },
            },
        });
        if (dup) {
            throw new ConflictException(
                `El grupo ${dto.name} ya existe en el ciclo ${cycle.name}`,
            );
        }

        const group = await this.prisma.group.create({
            data: { name: dto.name, schoolYearId: dto.schoolYearId },
            include: { schoolYear: { select: { name: true } } },
        });

        await this.audit.log({
            level: 'INFO',
            action: 'group.create',
            actorId: creatorId,
            message: `Creó el grupo ${group.name} (${cycle.name})`,
        });

        return group;
    }

    findAll() {
        return this.prisma.group.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                schoolYear: { select: { name: true } },
                teacher: { select: { id: true, name: true } },
                _count: { select: { students: true } },
            },
        });
    }
}