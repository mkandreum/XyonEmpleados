const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔍 Checking Users in Database...');
        const users = await prisma.user.findMany({
            select: { email: true, role: true, name: true }
        });

        if (users.length === 0) {
            console.log('❌ No users found!');
        } else {
            console.table(users);
        }
    } catch (e) {
        console.error('❌ Error checking users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
