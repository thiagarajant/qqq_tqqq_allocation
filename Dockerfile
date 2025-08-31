# Multi-stage Dockerfile for Stock Market Analysis Web Application
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install root dependencies
RUN npm ci --only=production

# Install backend dependencies
RUN cd backend && npm ci --only=production

# Install frontend dependencies
RUN cd frontend && npm install

# Build stage for frontend
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies (including dev dependencies for build)
RUN npm ci
RUN cd backend && npm ci
RUN cd frontend && npm install

# Copy source code
COPY . .

# Build frontend (ensure we're in the right directory)
WORKDIR /app/frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built frontend from build stage
COPY --from=build --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Copy backend source and package files
COPY --from=build --chown=nodejs:nodejs /app/backend ./backend
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Copy database
COPY --from=build --chown=nodejs:nodejs /app/database ./database

# Install only production dependencies
RUN npm ci --only=production
RUN cd backend && npm ci --only=production

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
