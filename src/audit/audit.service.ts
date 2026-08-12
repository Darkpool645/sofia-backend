import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from '../prisma/prisma.service';

type AuditInput = {
    level?: 'INFO' | 'WARN' | 'ERROR';
    action: string;
    actorId?: string | null;
    method?: string;
    path?: string;
    statusCode?: number;
    message?: string;
    metadata?: any;
    ip?: string;
};

@Injectable()
export class AuditService {
    private readonly logger = new Logger('Audit');

    constructor(private prisma: PrismaService) {}

    async log(input: AuditInput) {
        try{
            await this.prisma.auditLog.create({
                data: {
                    level: (input.level ?? 'INFO') as any,
                    action: input.action,
                    actorId: input.actorId ?? null,
                    method: input.method,
                    path: input.path,
                    statusCode: input.statusCode,
                    message: input.message,
                    metadata: input.metadata,
                    ip: input.ip
                }
            })
        } catch (e) {
            this.logger.error('No se pudo escribir el audit log', e as Error);
        }
    }

    find(params: { level?: string; take?: number }) {
        return this.prisma.auditLog.findMany({
            where: params.level ? { level: params.level as any } : undefined,
            orderBy: { createdAt: 'desc' },
            take: params.take ?? 100,
            include: { actor: { select: { email: true, role: true } } },
        });
    }
}