import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from 'bcryptjs';
import { PrismaService } from "src/prisma/prisma.service";
import { AuditService } from "src/audit/audit.service";
import { CreateTeacherDto } from './dto/create-teacher.dto';

const teacherSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    classes: {
        select: {
            id: true,
            subject: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            group: { select: { id: true, name: true } },
        },
    },
} as const;

@Injectable()
export class TeachersService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditService,
    ) { }

    async create(creatorId: string, dto: CreateTeacherDto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (exists) throw new ConflictException('El correo ya está registrado');

        const assignments = dto.assignments ?? [];

        if (assignments.length > 0) {
            const groupIds = [...new Set(assignments.map((a) => a.groupId))];
            const found = await this.prisma.group.findMany({
                where: { id: { in: groupIds as string[] } },
                select: { id: true }
            });

            if (found.length !== groupIds.length) {
                throw new BadRequestException('Uno o más grupos no existen');
            }

            for (const a of assignments) {
                if (a.startTime >= a.endTime) {
                    throw new BadRequestException(`En "${a.subject}", la hora de inicio debe ser menor a la de fin.`);
                }
            }
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const teacher = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    role: 'PROFESOR',
                    passwordHash,
                },
            });

            if (assignments.length > 0) {
                await tx.classSlot.createMany({
                    data: assignments.map((a) => ({
                        teacherId: user.id,
                        groupId: a.groupId,
                        subject: a.subject,
                        dayOfWeek: a.dayOfWeek,
                        startTime: a.startTime,
                        endTime: a.endTime,
                    })),
                });
            }
            return user;
        });

        await this.audit.log({
            level: 'INFO',
            action: 'teacher.create',
            actorId: creatorId,
            message: `Creaó al docente ${teacher.email} con ${assignments.length} asignación(es)`
        });

    }

    findAll() {
        return this.prisma.user.findMany({
            where: { role: 'PROFESOR' },
            orderBy: { createdAt: 'desc' },
            select: teacherSelect
        });
    }
}