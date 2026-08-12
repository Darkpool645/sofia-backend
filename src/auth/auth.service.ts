import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcryptjs';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private audit: AuditService,
    ) {}

    async login(email: string, password: string, ip?: string) {
        const user = await this.prisma.user.findUnique({ where: { email }});

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            await this.audit.log({
                level: 'WARN',
                action: 'auth.login.failed',
                message: `Intento fallido para ${email}`,
                ip,
            });
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = await this.jwt.signAsync(payload);

        await this.audit.log({
            level: 'INFO',
            action: 'auth.login',
            actorId: user.id,
            message: `${user.email} inició sesión`,
            ip,
        });

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        }
    }
}