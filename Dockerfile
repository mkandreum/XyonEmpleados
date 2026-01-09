# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the Vite app
RUN npm run build   
# Output is usually in /dist

# Stage 2: Setup Backend & Runtime
FROM node:20-alpine
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ .

# Copy built frontend to backend's public directory
COPY --from=frontend-builder /app/dist ./public

# Copy Prisma schema
COPY backend/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Create uploads directory structure
RUN mkdir -p uploads/logos uploads/avatars uploads/payrolls uploads/justifications uploads/news

# Declare volume for persistent storage
VOLUME ["/app/uploads"]

# Expose port
EXPOSE 3000

# Command to run migrations, seed (idempotent), and start server
CMD npx prisma db push && npx prisma db seed && node src/server.js
