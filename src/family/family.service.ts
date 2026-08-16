import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  // Los hijos del padre logueado (para el selector).
  children(parentId: string) {
    return this.prisma.student.findMany({
      where: { guardianId: parentId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        group: { select: { id: true, name: true } },
      },
    });
  }

  // Muro: tareas del grupo del hijo + la entrega de ESE hijo (si existe).
  async feed(parentId: string, childId: string) {
    const child = await this.prisma.student.findFirst({
      where: { id: childId, guardianId: parentId },
      select: { id: true, groupId: true },
    });
    if (!child) throw new ForbiddenException('Ese alumno no es tu hijo.');

    const tasks = await this.prisma.task.findMany({
      where: { groupId: child.groupId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        dueDate: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        group: { select: { name: true } },
        // Solo la entrega de este hijo (0 o 1 elemento).
        submissions: {
          where: { studentId: childId },
          select: { delivered: true, grade: true },
        },
      },
    });

    // Aplana submissions[] a mySubmission (o null si no hay registro).
    return tasks.map(({ submissions, ...rest }) => ({
      ...rest,
      mySubmission: submissions[0] ?? null,
    }));
  }
}