import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(teacherId: string, dto: CreateTaskDto) {
    const groupIds = [...new Set(dto.groupIds)];

    // El docente solo puede publicar en grupos donde imparte (tiene ClassSlot).
    const mySlots = await this.prisma.classSlot.findMany({
      where: { teacherId, groupId: { in: groupIds } },
      select: { groupId: true },
      distinct: ['groupId'],
    });
    const allowed = new Set(mySlots.map((s) => s.groupId));
    const notAllowed = groupIds.filter((id) => !allowed.has(id));
    if (notAllowed.length > 0) {
      throw new ForbiddenException(
        'Solo puedes publicar en grupos donde impartes clase.',
      );
    }

    // Una Task por grupo (cada grupo lleva su propio seguimiento).
    const created = await this.prisma.$transaction(
      groupIds.map((groupId) =>
        this.prisma.task.create({
          data: {
            title: dto.title,
            description: dto.description,
            type: dto.type as any,
            dueDate: new Date(dto.dueDate),
            groupId,
            createdById: teacherId,
          },
          include: { group: { select: { id: true, name: true } } },
        }),
      ),
    );

    await this.audit.log({
      level: 'INFO',
      action: 'task.create',
      actorId: teacherId,
      message: `Publicó ${dto.type} "${dto.title}" en ${groupIds.length} grupo(s)`,
    });

    return created;
  }

  findMine(teacherId: string) {
    return this.prisma.task.findMany({
      where: { createdById: teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });
  }
}