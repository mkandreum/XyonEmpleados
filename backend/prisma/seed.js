const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // Create Admin User
    const hashedPassword = await bcrypt.hash('admin_password_123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@xyonempleados.com' },
        update: {},
        create: {
            email: 'admin@xyonempleados.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
            department: 'IT',
            position: 'System Administrator',
            joinDate: new Date(),
        },
    });

    console.log(`✓ Admin user: ${admin.id}`);

    // Create sample news
    await prisma.newsItem.upsert({
        where: { id: 'news-1' },
        update: {},
        create: {
            id: 'news-1',
            title: 'Bienvenido al Portal del Empleado',
            summary: 'Lanzamiento oficial de la nueva plataforma.',
            content: 'Estamos encantados de anunciar el lanzamiento de nuestro nuevo portal del empleado. Aquí podrás gestionar tus nóminas, vacaciones y mucho más.',
            category: 'CORPORATE',
            imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        }
    });

    // Create sample holidays
    const currentYear = new Date().getFullYear();
    await prisma.holiday.upsert({
        where: { id: 'holiday-1' },
        update: {},
        create: {
            id: 'holiday-1',
            name: 'Asunción de la Virgen',
            date: new Date(currentYear, 7, 15), // 15 Agosto
            year: currentYear
        }
    });

    await prisma.holiday.upsert({
        where: { id: 'holiday-2' },
        update: {},
        create: {
            id: 'holiday-2',
            name: 'Día de la Hispanidad',
            date: new Date(currentYear, 9, 12), // 12 Octubre
            year: currentYear
        }
    });

    // Create sample events
    await prisma.event.upsert({
        where: { id: 'event-1' },
        update: {},
        create: {
            id: 'event-1',
            title: 'Reunión Trimestral',
            description: 'Revisión de objetivos del trimestre',
            date: new Date(currentYear, 5, 20, 10, 0), // 20 Junio 10:00
            location: 'Sala A'
        }
    });

    console.log('✓ Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
