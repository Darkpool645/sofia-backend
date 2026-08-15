import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SaveAttendanceDto } from './dto/save-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Lista de alumnos de la clase + el estado ya registrado ese día (si existe).
  async roster(teacherId: string, classId: string, dateStr?: string) {
    const slot = await this.assertOwnClass(teacherId, classId);
    const date = this.normalizeDate(dateStr);

    const students = await this.prisma.student.findMany({
      where: { groupId: slot.groupId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    const existing = await this.prisma.attendance.findMany({
      where: { classId, date },
      select: { studentId: true, status: true },
    });
    const statusByStudent = new Map(existing.map((a) => [a.studentId, a.status]));

    return {
      classId,
      subject: slot.subject,
      group: slot.group.name,
      date: date.toISOString(),
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        status: statusByStudent.get(s.id) ?? null,
      })),
    };
  }

  async save(teacherId: string, dto: SaveAttendanceDto) {
    await this.assertOwnClass(teacherId, dto.classId);
    const date = this.normalizeDate(dto.date);

    await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendance.upsert({
          where: {
            studentId_date_classId: {
              studentId: r.studentId,
              date,
              classId: dto.classId,
            },
          },
          create: {
            studentId: r.studentId,
            classId: dto.classId,
            date,
            status: r.status as any,
            markedById: teacherId,
          },
          update: { status: r.status as any, markedById: teacherId },
        }),
      ),
    );

    await this.audit.log({
      level: 'INFO',
      action: 'attendance.save',
      actorId: teacherId,
      message: `Registró asistencia de ${dto.records.length} alumno(s)`,
    });

    return { ok: true, count: dto.records.length };
  }

  // Verifica que la clase exista y sea del docente.
  private async assertOwnClass(teacherId: string, classId: string) {
    const slot = await this.prisma.classSlot.findUnique({
      where: { id: classId },
      select: {
        teacherId: true,
        groupId: true,
        subject: true,
        group: { select: { name: true } },
      },
    });
    if (!slot) throw new NotFoundException('Clase no encontrada.');
    if (slot.teacherId !== teacherId) {
      throw new ForbiddenException('Esta clase no es tuya.');
    }
    return slot;
  }

  // Medianoche UTC de la fecha dada (o de hoy), para el @@unique de Attendance.
  private normalizeDate(dateStr?: string): Date {
    const base = dateStr ? new Date(dateStr) : new Date();
    return new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
    );
  }
}