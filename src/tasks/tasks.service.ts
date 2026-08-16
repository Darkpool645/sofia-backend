import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { SaveSubmissionsDto } from './dto/save-submissions.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) { }

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

  async getSubmissions(teacherId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true, title: true, type: true, groupId: true, createdById: true,
        group: { select: { name: true } },
      },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada.');
    if (task.createdById !== teacherId) {
      throw new ForbiddenException('Esta tarea no es tuya.');
    }

    const students = await this.prisma.student.findMany({
      where: { groupId: task.groupId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    const subs = await this.prisma.submission.findMany({
      where: { taskId },
      select: { studentId: true, delivered: true, grade: true },
    });
    const byStudent = new Map(subs.map((s) => [s.studentId, s]));

    return {
      taskId: task.id,
      title: task.title,
      type: task.type,
      group: task.group.name,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        delivered: byStudent.get(s.id)?.delivered ?? false,
        grade: byStudent.get(s.id)?.grade ?? null,
      })),
    };
  }

  async saveSubmissions(teacherId: string, taskId: string, dto: SaveSubmissionsDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada.');
    if (task.createdById !== teacherId) {
      throw new ForbiddenException('Esta tarea no es tuya.');
    }

    await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.submission.upsert({
          where: { taskId_studentId: { taskId, studentId: r.studentId } },
          create: {
            taskId,
            studentId: r.studentId,
            delivered: r.delivered,
            grade: r.grade ?? null,
          },
          update: { delivered: r.delivered, grade: r.grade ?? null },
        }),
      ),
    );

    await this.audit.log({
      level: 'INFO',
      action: 'submission.save',
      actorId: teacherId,
      message: `Registró ${dto.records.length} entrega(s) de la tarea ${taskId}`,
    });

    return { ok: true, count: dto.records.length };
  }

  async update(teacherId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada.');
    if (task.createdById !== teacherId) {
      throw new ForbiddenException('Esta tarea no es tuya.');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
      },
      include: { group: { select: { id: true, name: true } } },
    });

    await this.audit.log({
      level: 'INFO',
      action: 'task.update',
      actorId: teacherId,
      message: `Editó la tarea ${taskId}`,
    });

    return updated;
  }
}