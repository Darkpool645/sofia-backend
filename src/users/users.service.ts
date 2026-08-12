import { 
    ConflictException,
    ForbiddenException,
    Injectable
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';

const CREATABLE_BY: Record<string, string[]> = {
    SUPERADMIN: ['ADMIN'],
    ADMIN: ['PROFESOR', 'PADRE'],
};

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditService,
    ) {}

    async create(creator: { id: string; role: string }, dto: CreateUserDto) {
        const allowed = CREATABLE_BY[creator.role] ?? [];
        if (!allowed.includes(dto.role)) {
            throw new ForbiddenException(
                `Un ${creator.role} no puede crear un ${dto.role}`,
            );
        }

        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (exists) throw new ConflictException('El correo ya está registrado.');

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data:{
                name: dto.name,
                email: dto.email,
                role: dto.role as any,
                passwordHash
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            },
        });

        await this.audit.log({
            level: 'INFO',
            action: 'user.create',
            actorId: creator.id,
            message: `Creó a ${user.email} (${user.role})`,
            metadata: { createdUserId: user.id },
        });

        return user;
    }

    findAll() {
        return this.prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }
}