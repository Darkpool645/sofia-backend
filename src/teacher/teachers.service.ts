import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from 'bcryptjs';
import { PrismaService } from "src/prisma/prisma.service";
import { AuditService } from "src/audit/audit.service";
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from "./dto/update-teacher.dto";

const DAYS: Record<number, string> = {
    1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves',
    5: 'viernes', 6: 'sábado', 7: 'domingo',
};

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

    private assertNoClashes(
        assignments: { dayOfWeek: number; startTime: string; endTime: string} [],
    ) {
        const byDay = new Map<number, { start: string, end: string }[]>();
        for (const a of assignments) {
            const list = byDay.get(a.dayOfWeek) ?? [];
            list.push({ start: a.startTime, end: a.endTime });
            byDay.set(a.dayOfWeek, list);
        }
        for (const [day, list] of byDay) {
            list.sort((x, y) => x.start.localeCompare(y.start));
            for (let i = 1; i < list.length; i++){
                if (list[i].start < list[i - 1].end) {
                    throw new BadRequestException(
                        `Horarios traslapados el ${DAYS[day]}: ${list[i - 1].start}-${list[i-1].end} y ${list[i].start}-${list[i].end}.`
                    );
                }
            }
        }
    }

    async create(creatorId: string, dto: CreateTeacherDto) {
        const exists = await this.prisma.user.findUnique({
            where: { username: dto.username },
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
                this.assertNoClashes(assignments);
            }
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const teacher = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: dto.name,
                    username: dto.username,
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

    findOne(id: string) {
        return this.prisma.user.findFirst({
            where: { id, role: 'PROFESOR' },
            select: teacherSelect
        });
    }

    async update(adminId: string, id:string, dto: UpdateTeacherDto){
        const teacher = await this.prisma.user.findFirst({
            where: { id, role: 'PROFESOR' },
        });
        if (!teacher) throw new NotFoundException('Docente no encontrado');

        if (dto.email !== teacher.email) {
            const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (taken) throw new ConflictException('El correo ya está registrado');
        }

        const assignments = dto.assignments ?? [];
        if (assignments.length > 0) {
            const groupIds = [...new Set(assignments.map((a) => a.groupId))];
            const found = await this.prisma.group.findMany({
                where: { id: { in: groupIds } },
                select: { id: true },
            });
            if (found.length !== groupIds.length) {
                throw new BadRequestException('Uno o más grupos no existen.');
            }
            for (const a of assignments) {
                if (a.startTime >= a.endTime) {
                    throw new BadRequestException(
                        `En "${a.subject}", la hora de inicio debe ser menor a la de fin.`,
                    );
                }
            }
            this.assertNoClashes(assignments);
        }

        let passwordHash: string | undefined;
        if (dto.password) passwordHash = await bcrypt.hash(dto.password, 10);
        
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: {
                    name: dto.name,
                    email: dto.email,
                    ...(passwordHash ? { passwordHash} : {}),
                },
            });

            const existing = await tx.classSlot.findMany({
                where: { teacherId: id },
                select: { id : true },
            });
            const existingIds = new Set(existing.map((e) => e.id));
            const incomingIds = new Set(
                assignments.filter((a) => a.id).map((a) => a.id as string),
            );

            const toDelete = [...existingIds].filter((eid) => !incomingIds.has(eid));
            if (toDelete.length > 0) {
                await tx.classSlot.deleteMany({
                    where: { id: { in: toDelete }, teacherId: id },
                });
            }

            for (const a of assignments) {
                if (a.id && existingIds.has(a.id)) {
                    await tx.classSlot.update({
                        where: { id: a.id },
                        data: {
                            groupId: a.groupId,
                            subject: a.subject,
                            dayOfWeek: a.dayOfWeek,
                            startTime: a.startTime,
                            endTime: a.endTime,
                        }
                    });
                } else {
                    await tx.classSlot.create({
                        data: {
                            teacherId: id,
                            groupId: a.groupId,
                            subject: a.subject,
                            dayOfWeek:a.dayOfWeek,
                            startTime: a.startTime,
                            endTime: a.endTime
                        },
                    });
                }
            }
        });

        await this.audit.log({
            level: 'INFO',
            action: 'teacher.update',
            actorId: adminId,
            message: `Actualizó al docente ${dto.email}`,
        });

        return this.prisma.user.findFirst({
            where: { id, role: 'PROFESOR' },
            select: teacherSelect,
        })
    }
}