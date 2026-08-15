import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  // Todas las clases (ClassSlot) del docente, con su grupo y conteo de alumnos.
  // El frontend usa esto para el resumen de grupos y para detectar la clase actual.
  myClasses(teacherId: string) {
    return this.prisma.classSlot.findMany({
      where: { teacherId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        subject: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        group: {
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } },
          },
        },
      },
    });
  }
}