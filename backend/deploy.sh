#!/bin/bash
# Automatic migration script for Coolify deployment
# This script applies all pending Prisma migrations to the database

echo "🚀 Starting XyonEmpleados Backend Deployment..."
echo "📦 Installing dependencies..."
npm install

echo "🔄 Generating Prisma Client..."
npm run prisma:generate

echo "🗂️ Running pending database migrations..."
npm run prisma:migrate

echo "✅ All migrations completed successfully!"
echo "🌍 Starting server..."
node src/server.js
