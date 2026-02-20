# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build the Vite app
RUN npm run build   
# Output is usually in /dist

# Stage 2: Setup Backend & Runtime
FROM node:20-alpine
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --only=production

# Copy backend source
COPY backend/ .

# Copy built frontend to backend's public directory
COPY --from=frontend-builder /app/dist ./public

# Copy version.json generated during frontend build (prebuild script)
COPY --from=frontend-builder /app/backend/version.json ./version.json

# Copy Prisma schema
COPY backend/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Create uploads directory structure (public for logos/avatars/news, private for payrolls/justifications)
RUN mkdir -p uploads/public/logos uploads/public/avatars uploads/public/news uploads/private/payrolls uploads/private/justifications

# Declare volume for persistent storage
VOLUME ["/app/uploads"]

# Expose port
EXPOSE 3000

# Command to run migrations, seed (idempotent), and start server
CMD npx prisma db push --accept-data-loss && npx prisma db seed && node src/server.js
