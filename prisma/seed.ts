import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'Define SUPERADMIN_EMAIL y SUPERADMIN PASSWORD en tun .env antes de sembrar.',
        );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const superadmin = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            name: 'Super Administrador',
            role: 'SUPERADMIN',
            passwordHash
        },
    });

    console.log(`SUPERADMIN list ${superadmin.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });