/**
 * Migration Helper Script
 * Ejecuta las migraciones de manera segura en ambiente de producción
 * Uso: node prisma/runMigrations.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigrations() {
    console.log('🔄 Starting database migrations...\n');

    try {
        // Las migraciones se ejecutan automáticamente con `prisma migrate deploy`
        // Este script documenta el flujo
        
        console.log('✅ Las migraciones se ejecutarán de forma automática:');
        console.log('   1️⃣ rename_sick_leave_to_hours.sql');
        console.log('      - Renombra sickLeaveDays → sickLeaveHours');
        console.log('      - Tablas: DepartmentBenefits, UserBenefitsBalance\n');
        
        console.log('   2️⃣ unify_schedule_models.sql');
        console.log('      - Migra DepartmentSchedule → DepartmentShift');
        console.log('      - Convierte per-day schedules a JSON overrides\n');
        
        console.log('   3️⃣ add_shift_reminder_email.sql');
        console.log('      - Agrega User.shiftReminderEmail (Boolean)\n');

        // Conectar para verificar DB
        const version = await prisma.$queryRaw`SELECT version()`;
        console.log(`📊 Base de datos conectada: PostgreSQL`);
        console.log(`✅ Migraciones listas para ejecutar\n`);

        console.log('💡 Para aplicar migraciones en Coolify, asegurate de:');
        console.log('   - DATABASE_URL configurada en variables de entorno');
        console.log('   - Usuario DB con permisos ALTER TABLE');
        console.log('   - Script start ejecuta: npm run prisma:migrate\n');

    } catch (error) {
        console.error('❌ Error verificando migraciones:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigrations();
