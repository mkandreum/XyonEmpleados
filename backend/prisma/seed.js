const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // Create Admin User
    // Password: admin_password_123
    const hashedPassword = await bcrypt.hash('admin_password_123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@velilla.com' },
        update: {},
        create: {
            email: 'admin@velilla.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
            department: 'IT',
            position: 'System Administrator',
            joinDate: new Date(),
        },
    });

    console.log(`Created user with id: ${admin.id}`);

    // Create sample news
    await prisma.newsItem.create({
        data: {
            title: 'Bienvenido al Portal del Empleado',
            summary: 'Lanzamiento oficial de la nueva plataforma.',
            content: 'Estamos encantados de anunciar el lanzamiento...',
            category: 'CORPORATE',
            imageUrl: 'https://picsum.photos/400/200',
        }
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
