// Cliente Prisma compartido (evita crear un pool de conexiones por peticion/controlador)
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__xyonPrisma || new PrismaClient();
globalForPrisma.__xyonPrisma = prisma;

module.exports = prisma;
