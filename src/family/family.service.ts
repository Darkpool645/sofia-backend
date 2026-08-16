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

  // Muro: tareas/actividades/exámenes publicadas en el grupo del hijo.
  async feed(parentId: string, childId: string) {
    // El hijo debe pertenecer a este padre.
    const child = await this.prisma.student.findFirst({
      where: { id: childId, guardianId: parentId },
      select: { id: true, groupId: true },
    });
    if (!child) throw new ForbiddenException('Ese alumno no es tu hijo.');

    return this.prisma.task.findMany({
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
      },
    });
  }
}