import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SaveAttendanceDto } from './dto/save-attendance.dto';

// Zona horaria de la escuela (Morelos, México). Configúrala si cambia.
const SCHOOL_TZ = 'America/Mexico_City';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Lista de alumnos + su estado ese día + si la lista es editable.
  async roster(teacherId: string, classId: string, dateStr?: string) {
    const slot = await this.assertOwnClass(teacherId, classId);
    const date = this.normalizeDate(dateStr);
    const targetDateStr = this.toDateStr(date);

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
      editable: this.isEditable(slot, targetDateStr),
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        status: statusByStudent.get(s.id) ?? null,
      })),
    };
  }

  async save(teacherId: string, dto: SaveAttendanceDto) {
    const slot = await this.assertOwnClass(teacherId, dto.classId);
    const date = this.normalizeDate(dto.date);
    const targetDateStr = this.toDateStr(date);
    const now = this.nowParts();

    // Días anteriores: inmutables.
    if (targetDateStr < now.date) {
      throw new ForbiddenException(
        'No puedes modificar la asistencia de días anteriores.',
      );
    }
    // Días futuros: no permitidos.
    if (targetDateStr > now.date) {
      throw new BadRequestException(
        'No puedes registrar asistencia de días futuros.',
      );
    }
    // Hoy: solo dentro del horario de la clase.
    if (!this.isEditable(slot, targetDateStr)) {
      throw new ForbiddenException(
        'Solo puedes registrar la asistencia durante el horario de la clase.',
      );
    }

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

  // ── Reglas de edición ────────────────────────────────────────
  private isEditable(
    slot: { dayOfWeek: number; startTime: string; endTime: string },
    targetDateStr: string,
  ): boolean {
    const now = this.nowParts();
    if (targetDateStr !== now.date) return false; // pasado o futuro
    // Debe ser el día de la clase y estar dentro de su horario.
    return (
      slot.dayOfWeek === now.isoDow &&
      now.time >= slot.startTime &&
      now.time <= slot.endTime
    );
  }

  // Fecha/hora actuales en la zona de la escuela.
  private nowParts(): { date: string; time: string; isoDow: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SCHOOL_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const g = (t: string) => parts.find((p) => p.type === t)!.value;

    const date = `${g('year')}-${g('month')}-${g('day')}`;
    let hour = g('hour');
    if (hour === '24') hour = '00'; // algunos entornos devuelven 24 a medianoche
    const time = `${hour}:${g('minute')}`;

    const d = new Date(`${date}T12:00:00Z`);
    const dow = d.getUTCDay(); // 0 = domingo
    const isoDow = dow === 0 ? 7 : dow; // 1 = lunes ... 7 = domingo

    return { date, time, isoDow };
  }

  private async assertOwnClass(teacherId: string, classId: string) {
    const slot = await this.prisma.classSlot.findUnique({
      where: { id: classId },
      select: {
        teacherId: true,
        groupId: true,
        subject: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        group: { select: { name: true } },
      },
    });
    if (!slot) throw new NotFoundException('Clase no encontrada.');
    if (slot.teacherId !== teacherId) {
      throw new ForbiddenException('Esta clase no es tuya.');
    }
    return slot;
  }

  private normalizeDate(dateStr?: string): Date {
    const base = dateStr ? new Date(dateStr) : new Date();
    return new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
    );
  }

  private toDateStr(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
}