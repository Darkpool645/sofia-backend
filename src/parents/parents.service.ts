import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateParentDto } from './dto/create-parent.dto';

const parentSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  children: {
    select: {
      id: true,
      name: true,
      group: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class ParentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(creatorId: string, dto: CreateParentDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('El correo ya está registrado.');

    const children = dto.children ?? [];

    // Todos los grupos de los hijos deben existir.
    if (children.length > 0) {
      const groupIds = [...new Set(children.map((c) => c.groupId))];
      const found = await this.prisma.group.findMany({
        where: { id: { in: groupIds } },
        select: { id: true },
      });
      if (found.length !== groupIds.length) {
        throw new BadRequestException('Uno o más grupos no existen.');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Transacción: el padre y sus hijos se crean juntos o nada.
    const parent = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          role: 'PADRE',
          passwordHash,
        },
      });

      if (children.length > 0) {
        await tx.student.createMany({
          data: children.map((c) => ({
            name: c.name,
            groupId: c.groupId,
            guardianId: user.id,
          })),
        });
      }

      return user;
    });

    await this.audit.log({
      level: 'INFO',
      action: 'parent.create',
      actorId: creatorId,
      message: `Creó al padre ${parent.email} con ${children.length} hijo(s)`,
    });

    return this.prisma.user.findUnique({
      where: { id: parent.id },
      select: parentSelect,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      where: { role: 'PADRE' },
      orderBy: { createdAt: 'desc' },
      select: parentSelect,
    });
  }
}