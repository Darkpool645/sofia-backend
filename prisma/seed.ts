import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const FIRST = [
  'Diego', 'Ana', 'Bruno', 'Elena', 'Iker', 'Lucía', 'Mateo', 'Sofía',
  'Emilia', 'Hugo', 'Valentina', 'Leo', 'Regina', 'Ángel', 'Camila',
  'Daniel', 'Renata', 'Emiliano', 'Ximena', 'Santiago', 'Fernanda',
];
const LAST = [
  'Herrera', 'Ríos', 'Salas', 'Cruz', 'Montes', 'Vega', 'Ponce', 'Ruiz',
  'Camargo', 'Gómez', 'Luna', 'Ibarra', 'Ortiz', 'Mendoza', 'Cano',
  'Reyes', 'Flores', 'Rojas', 'Núñez', 'Campos',
];
const fullName = () => `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`;

const SUBJECTS = [
  'Matemáticas', 'Español', 'Ciencias', 'Historia',
  'Inglés', 'Educación Física', 'Arte',
];

const COMMON_PASSWORD = 'Sofia123!';

// Matrícula tipo estudiante: año + consecutivo a 4 dígitos → 20260001
const matricula = (i: number) => `2026${String(i).padStart(4, '0')}`;

function lastPastDateForDow(isoDow: number): Date {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - 1);
  for (let i = 0; i < 7; i++) {
    const dow = d.getUTCDay();
    const iso = dow === 0 ? 7 : dow;
    if (iso === isoDow) return d;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

async function wipe() {
  await prisma.attendance.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.aviso.deleteMany();
  await prisma.evaluationItem.deleteMany();
  await prisma.classSlot.deleteMany();
  await prisma.student.deleteMany();
  await prisma.privacyConsent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.group.deleteMany();
  await prisma.schoolYear.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('🧹 Limpiando base de datos…');
  await wipe();

  const commonHash = await bcrypt.hash(COMMON_PASSWORD, 10);

  // SUPERADMIN
  const superUser = process.env.SUPERADMIN_USERNAME ?? 'superadmin';
  const superPass = process.env.SUPERADMIN_PASSWORD ?? COMMON_PASSWORD;
  await prisma.user.create({
    data: {
      username: superUser,
      name: 'Super Administrador',
      role: 'SUPERADMIN',
      passwordHash: await bcrypt.hash(superPass, 10),
    },
  });

  // ADMIN
  await prisma.user.create({
    data: {
      username: 'admin',
      name: 'Ana Administradora',
      role: 'ADMIN',
      passwordHash: commonHash,
    },
  });

  // DOCENTES
  const teachers: { id: string; subject: string }[] = [];
  for (let s = 0; s < SUBJECTS.length; s++) {
    const t = await prisma.user.create({
      data: {
        username: `prof${s + 1}`,
        name: `Profe ${SUBJECTS[s]}`,
        role: 'PROFESOR',
        passwordHash: commonHash,
      },
    });
    teachers.push({ id: t.id, subject: SUBJECTS[s] });
  }

  // CICLO
  const cycle = await prisma.schoolYear.create({
    data: {
      name: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-06-30'),
      active: true,
    },
  });

  // GRUPOS + ALUMNOS + CLASES
  const gradeNames = ['1°A', '1°B', '2°A', '2°B', '3°A', '3°B', '4°A', '4°B', '5°A', '5°B'];
  const slotsByGroup: Record<
    string,
    { id: string; teacherId: string; subject: string; dayOfWeek: number }[]
  > = {};

  for (let g = 0; g < 10; g++) {
    const group = await prisma.group.create({
      data: { name: gradeNames[g], schoolYearId: cycle.id },
    });

    const n = rand(15, 20);
    await prisma.student.createMany({
      data: Array.from({ length: n }, () => ({
        name: fullName(),
        groupId: group.id,
      })),
    });

    const startHour = 9 + (g % 8);
    const start = `${String(startHour).padStart(2, '0')}:00`;
    const end = `${String(startHour + 1).padStart(2, '0')}:00`;

    slotsByGroup[group.id] = [];
    for (let d = 1; d <= 7; d++) {
      const teacher = teachers[(g + d) % 7];
      const slot = await prisma.classSlot.create({
        data: {
          subject: teacher.subject,
          groupId: group.id,
          teacherId: teacher.id,
          dayOfWeek: d,
          startTime: start,
          endTime: end,
        },
      });
      slotsByGroup[group.id].push({
        id: slot.id,
        teacherId: teacher.id,
        subject: teacher.subject,
        dayOfWeek: d,
      });
    }
    console.log(`  ✔ Grupo ${gradeNames[g]} · ${n} alumnos · 7 clases`);
  }

  // PADRES (username con formato de matrícula)
  const allStudents = shuffle(
    await prisma.student.findMany({ select: { id: true } }),
  );
  let idx = 0;
  const parentMatriculas: string[] = [];
  for (let p = 0; p < 12; p++) {
    const mat = matricula(p + 1);
    parentMatriculas.push(mat);
    const parent = await prisma.user.create({
      data: {
        username: mat,
        name: `${pick(FIRST)} ${pick(LAST)}`,
        role: 'PADRE',
        passwordHash: commonHash,
      },
    });
    const kids = p < 6 ? 2 : 1;
    for (let k = 0; k < kids && idx < allStudents.length; k++) {
      await prisma.student.update({
        where: { id: allStudents[idx].id },
        data: { guardianId: parent.id },
      });
      idx++;
    }
  }

  // TAREAS + ENTREGAS + ASISTENCIA
  const types = ['TAREA', 'ACTIVIDAD', 'EXAMEN'] as const;
  for (const groupId of Object.keys(slotsByGroup)) {
    const slots = slotsByGroup[groupId];
    const students = await prisma.student.findMany({
      where: { groupId },
      select: { id: true },
    });

    const chosen = shuffle(slots).slice(0, 3);
    let firstTaskId: string | null = null;
    for (let i = 0; i < chosen.length; i++) {
      const slot = chosen[i];
      const due = new Date();
      due.setDate(due.getDate() + rand(2, 10));
      const task = await prisma.task.create({
        data: {
          title: `${pick(['Repaso', 'Ejercicios', 'Proyecto', 'Lectura', 'Práctica'])} de ${slot.subject}`,
          description: 'Material de práctica para reforzar el tema.',
          type: types[i % types.length],
          dueDate: due,
          groupId,
          createdById: slot.teacherId,
        },
      });
      if (i === 0) firstTaskId = task.id;
    }

    if (firstTaskId) {
      await prisma.submission.createMany({
        data: students.map((s) => {
          const delivered = Math.random() > 0.25;
          return {
            taskId: firstTaskId!,
            studentId: s.id,
            delivered,
            grade: delivered ? rand(6, 10) : null,
          };
        }),
      });
    }

    const slot = slots[0];
    const date = lastPastDateForDow(slot.dayOfWeek);
    await prisma.attendance.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        classId: slot.id,
        date,
        status: (Math.random() > 0.15 ? 'PRESENTE' : 'AUSENTE') as any,
        markedById: slot.teacherId,
      })),
    });
  }

  console.log('\n✅ Datos creados. Credenciales (contraseña común salvo superadmin):');
  console.log(`  SUPERADMIN: ${superUser}  /  (tu SUPERADMIN_PASSWORD)`);
  console.log(`  ADMIN:      admin  /  ${COMMON_PASSWORD}`);
  console.log(`  DOCENTES:   prof1 … prof7  /  ${COMMON_PASSWORD}`);
  console.log(`  PADRES (matrícula):  ${parentMatriculas[0]} … ${parentMatriculas[parentMatriculas.length - 1]}  /  ${COMMON_PASSWORD}`);
  console.log(`     ${parentMatriculas.join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });