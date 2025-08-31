# Docker & DevOps - Stock Market Analysis Containerization

## 🎯 **Overview**

This document provides comprehensive information about the Docker containerization setup for the Stock Market Analysis application. The system uses multi-stage Docker builds, Docker Compose orchestration, and optimized container configurations for both development and production environments.

## 🏗️ **Architecture Overview**

### **Container Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Frontend      │    │    Backend      │                │
│  │   Container     │    │   Container     │                │
│  │   Port: 5173    │    │   Port: 3000    │                │
│  │   (Dev/Prod)    │    │   (Production)  │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           └───────────────────────┼────────────────────────┘
│                                   │
│  ┌─────────────────────────────────┼─────────────────────┐  │
│  │         Docker Network          │                     │  │
│  │   stock-market-analysis-network │                     │  │
│  └─────────────────────────────────┴─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Service Configuration**
- **Frontend**: React development server with hot reload
- **Backend**: Express.js API server with SQLite database
- **Network**: Isolated Docker network for service communication
- **Volumes**: Persistent data storage and hot reload capabilities

## 🐳 **Docker Configuration Files**

### **1. Dockerfile (Multi-stage Build)**

#### **Build Stages Overview**
```dockerfile
# Multi-stage Dockerfile for Stock Market Analysis Web Application
FROM node:18-alpine AS base      # Base image with Node.js
FROM node:18-alpine AS build     # Build stage for frontend
FROM node:18-alpine AS production # Production runtime
```

#### **Base Stage**
```dockerfile
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install root dependencies
RUN npm install --only=production

# Install backend dependencies
RUN cd backend && npm install --only=production
RUN cd backend && npm rebuild sqlite3

# Install frontend dependencies
RUN cd frontend && npm install
```

**Purpose**: Install production dependencies and prepare base environment
**Key Features**:
- **Alpine Linux**: Lightweight base image (~5MB)
- **Node.js 18**: LTS version with long-term support
- **SQLite3 Rebuild**: Ensures binary compatibility in containers
- **Production Dependencies**: Optimized for runtime performance

#### **Build Stage**
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies (including dev dependencies for build)
RUN npm install
RUN cd backend && npm install
RUN cd backend && npm rebuild sqlite3
RUN cd frontend && npm install

# Copy source code
COPY . .

# Build frontend (ensure we're in the right directory)
WORKDIR /app/frontend
RUN npm run build
```

**Purpose**: Build the frontend application for production
**Key Features**:
- **Full Dependencies**: Includes development dependencies for build tools
- **Source Code Copy**: Copies entire project for building
- **Frontend Build**: Creates optimized production build with Vite
- **Build Output**: Generates static files in `dist/` directory

#### **Production Stage**
```dockerfile
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
RUN npm install --only=production
RUN cd backend && npm install --only=production
RUN cd backend && npm rebuild sqlite3

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
```

**Purpose**: Create optimized production runtime container
**Key Features**:
- **Security**: Non-root user execution
- **Signal Handling**: Proper process signal management with dumb-init
- **Health Checks**: Automated health monitoring
- **Optimized Size**: Only production dependencies and built assets

### **2. docker-compose.yml**

#### **Service Definitions**

##### **Production Service**
```yaml
stock-market-analysis-app:
  build: .
  image: stock-market-analysis:latest
  container_name: stock-market-analysis-webapp
  ports:
    - "3000:3000"
  volumes:
    - ./database:/app/database
    - ./logs:/app/logs
  environment:
    - NODE_ENV=production
    - PORT=3000
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  networks:
    - stock-market-analysis-network
```

**Purpose**: Full-stack production application
**Features**:
- **Port Mapping**: Exposes backend API on port 3000
- **Volume Mounts**: Persistent database and logs storage
- **Health Checks**: Automated container health monitoring
- **Restart Policy**: Automatic restart on failure

##### **Development Service**
```yaml
stock-market-analysis-dev:
  build:
    context: .
    dockerfile: Dockerfile
    target: build
  container_name: stock-market-analysis-dev
  ports:
    - "5173:5173"
    - "3001:3000"
  volumes:
    - .:/app
    - /app/node_modules
    - /app/backend/node_modules
    - /app/frontend/node_modules
    - ./database:/app/database
  environment:
    - NODE_ENV=development
    - PORT=3000
  command: cd frontend && npm run dev
  profiles:
    - dev
  networks:
    - stock-market-analysis-network
```

**Purpose**: Frontend development with hot reload
**Features**:
- **Hot Reload**: Source code mounted for live updates
- **Port Mapping**: Frontend dev server on 5173, backend on 3001
- **Volume Mounts**: Source code and node_modules isolation
- **Development Profile**: Only starts when explicitly requested

#### **Network Configuration**
```yaml
networks:
  stock-market-analysis-network:
    driver: bridge

volumes:
  logs:
```

**Purpose**: Isolated network for service communication
**Features**:
- **Bridge Network**: Default Docker networking
- **Service Discovery**: Automatic service name resolution
- **Isolation**: Separate from host network

### **3. .dockerignore**

#### **Excluded Files**
```dockerignore
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist
build

# Development files
.env.local
.env.development.local
.env.test.local
.env.production.local

# Git and version control
.git
.gitignore
README.md

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode
.idea
*.swp
*.swo

# Logs
logs
*.log

# Database files (too large for Docker context)
database/*.db
database/*.db-*
```

**Purpose**: Optimize Docker build context and image size
**Benefits**:
- **Faster Builds**: Smaller build context
- **Smaller Images**: Exclude unnecessary files
- **Security**: Prevent sensitive files from being included

## 🚀 **Build & Deployment**

### **Build Process**

#### **1. Development Build**
```bash
# Build development image
docker-compose --profile dev build

# Start development services
docker-compose --profile dev up -d

# View logs
docker-compose logs -f stock-market-analysis-dev
```

#### **2. Production Build**
```bash
# Build production image
docker-compose build

# Start production services
docker-compose up -d

# Check status
docker-compose ps
```

#### **3. Multi-stage Build Optimization**
```bash
# Build specific stage
docker build --target build -t stock-analysis:build .

# Build production stage
docker build --target production -t stock-analysis:prod .

# View image layers
docker history stock-analysis:prod
```

### **Image Optimization**

#### **Layer Caching Strategy**
```dockerfile
# Optimize dependency installation
COPY package*.json ./
RUN npm install --only=production

# Copy source code after dependencies
COPY . .
```

**Benefits**:
- **Faster Rebuilds**: Dependencies cached separately from source
- **Efficient Updates**: Only rebuild when dependencies change
- **CI/CD Optimization**: Leverage Docker layer caching

#### **Multi-stage Benefits**
- **Smaller Production Images**: Exclude build tools and dev dependencies
- **Security**: Production images contain only runtime requirements
- **Efficiency**: Separate build and runtime environments

## 🔧 **Development Workflow**

### **Local Development Setup**

#### **1. Start Development Environment**
```bash
# Start frontend development container
docker-compose --profile dev up -d

# Access frontend
open http://localhost:5173

# Access backend API
curl http://localhost:3001/api/health
```

#### **2. Development Features**
- **Hot Reload**: Frontend automatically updates on code changes
- **Volume Mounts**: Source code changes reflected immediately
- **Port Mapping**: Frontend on 5173, backend on 3001
- **Environment Variables**: Development-specific configuration

#### **3. Debugging**
```bash
# View container logs
docker-compose logs -f stock-market-analysis-dev

# Execute commands in container
docker-compose exec stock-market-analysis-dev sh

# Check container status
docker-compose ps
```

### **Production Deployment**

#### **1. Build and Deploy**
```bash
# Build production image
docker-compose build

# Start production services
docker-compose up -d

# Verify deployment
docker-compose ps
curl http://localhost:3000/api/health
```

#### **2. Production Features**
- **Health Checks**: Automated health monitoring
- **Restart Policy**: Automatic recovery from failures
- **Resource Limits**: Controlled resource consumption
- **Security**: Non-root user execution

## 📊 **Monitoring & Health Checks**

### **Health Check Configuration**

#### **Backend Health Check**
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Purpose**: Monitor backend API availability
**Parameters**:
- **interval**: Check frequency (30 seconds)
- **timeout**: Maximum response time (10 seconds)
- **retries**: Consecutive failures before marking unhealthy (3)
- **start_period**: Initial grace period (40 seconds)

#### **Health Check Endpoint**
```javascript
// Backend health check implementation
app.get('/api/health', (req, res) => {
  // Check database connectivity
  db.get("SELECT 1", (err) => {
    if (err) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: err.message
      });
    } else {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    }
  });
});
```

### **Monitoring Commands**

#### **Container Health Status**
```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect stock-market-analysis-webapp | grep -A 10 Health

# Manual health check
curl http://localhost:3000/api/health
```

#### **Resource Monitoring**
```bash
# Container resource usage
docker stats stock-market-analysis-webapp

# Container logs
docker-compose logs -f stock-market-analysis-webapp

# Container inspection
docker inspect stock-market-analysis-webapp
```

## 🔒 **Security Features**

### **Container Security**

#### **Non-root User Execution**
```dockerfile
# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs
```

**Benefits**:
- **Reduced Attack Surface**: Non-privileged execution
- **File System Security**: Limited access to host resources
- **Process Isolation**: Containerized process execution

#### **Signal Handling**
```dockerfile
# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]
```

**Purpose**: Proper process signal management
**Benefits**:
- **Graceful Shutdown**: Handle SIGTERM and SIGINT properly
- **Process Cleanup**: Ensure child processes are terminated
- **Container Orchestration**: Work properly with Docker and Kubernetes

### **Network Security**

#### **Isolated Network**
```yaml
networks:
  stock-market-analysis-network:
    driver: bridge
```

**Benefits**:
- **Service Isolation**: Separate from host network
- **Controlled Communication**: Only defined services can communicate
- **Port Management**: Explicit port exposure control

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Port Conflicts**
```bash
# Check port usage
lsof -i :3000
lsof -i :5173

# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Use different host port
```

#### **2. Build Failures**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check build context
docker build --target build -t test .
```

#### **3. Container Startup Issues**
```bash
# Check container logs
docker-compose logs stock-market-analysis-webapp

# Check container status
docker-compose ps

# Restart services
docker-compose restart
```

#### **4. SQLite3 Binary Issues**
```bash
# Rebuild SQLite3 in container
docker-compose exec stock-market-analysis-webapp sh
cd backend && npm rebuild sqlite3

# Or rebuild entire container
docker-compose up --build -d
```

### **Debug Commands**

#### **Container Inspection**
```bash
# Inspect container configuration
docker inspect stock-market-analysis-webapp

# Check container filesystem
docker exec -it stock-market-analysis-webapp sh

# View container processes
docker exec stock-market-analysis-webapp ps aux
```

#### **Network Debugging**
```bash
# Check network configuration
docker network ls
docker network inspect stock_market_analysis_stock-market-analysis-network

# Test network connectivity
docker exec stock-market-analysis-webapp ping stock-market-analysis-dev
```

## 📈 **Performance Optimization**

### **Build Optimization**

#### **1. Layer Caching**
```dockerfile
# Optimize dependency installation order
COPY package*.json ./
RUN npm install --only=production

# Copy source code after dependencies
COPY . .
```

#### **2. Multi-stage Builds**
```dockerfile
# Build stage with all dependencies
FROM node:18-alpine AS build
RUN npm install

# Production stage with minimal dependencies
FROM node:18-alpine AS production
COPY --from=build /app/dist ./dist
```

### **Runtime Optimization**

#### **1. Resource Limits**
```yaml
# Add resource constraints
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

#### **2. Volume Optimization**
```yaml
# Optimize volume mounts
volumes:
  - .:/app:delegated  # Use delegated mount for better performance
  - /app/node_modules  # Exclude node_modules from host mount
```

## 🔄 **CI/CD Integration**

### **GitHub Actions Example**

#### **Build and Test Workflow**
```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker-compose build
    
    - name: Run tests
      run: docker-compose run --rm stock-market-analysis-app npm test
    
    - name: Push to registry
      if: github.ref == 'refs/heads/main'
      run: |
        docker tag stock-market-analysis:latest ${{ secrets.REGISTRY }}/stock-market-analysis:latest
        docker push ${{ secrets.REGISTRY }}/stock-market-analysis:latest
```

### **Deployment Pipeline**

#### **Production Deployment**
```bash
# Pull latest image
docker pull stock-market-analysis:latest

# Stop existing containers
docker-compose down

# Start with new image
docker-compose up -d

# Verify deployment
docker-compose ps
curl http://localhost:3000/api/health
```

## 📚 **Additional Resources**

### **Docker Documentation**
- **Docker Official Docs**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Multi-stage Builds**: https://docs.docker.com/develop/dev-best-practices/multistage-builds/

### **Best Practices**
- **Docker Security**: https://docs.docker.com/engine/security/
- **Container Optimization**: https://docs.docker.com/develop/dev-best-practices/
- **Production Checklist**: https://docs.docker.com/config/containers/multi-service_container/

---

**Docker Status**: ✅ **FULLY OPERATIONAL**  
**Last Updated**: January 2025  
**Version**: 1.0.0
