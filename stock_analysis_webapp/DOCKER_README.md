# Docker Setup for Stock Analysis Web Application

This document explains how to run the Stock Analysis Web Application using Docker, making it easy to deploy in any environment.

## Prerequisites

- Docker installed and running
- Docker Compose installed
- At least 2GB of available RAM
- The `market_data.db` file in the `./database/` directory

## Quick Start

### 1. Build and Run (Production)

```bash
# Build and run the application
./docker-run.sh run

# Or use docker-compose directly
docker-compose up -d
```

The application will be available at: **http://localhost:3000**

### 2. Development Mode

```bash
# Run in development mode with hot reloading
./docker-run.sh dev

# Or use docker-compose directly
docker-compose --profile dev up -d
```

- Backend API: **http://localhost:3001**
- Frontend Dev Server: **http://localhost:5173**

## Docker Management Commands

The `docker-run.sh` script provides easy management commands:

```bash
# View all available commands
./docker-run.sh help

# Build the Docker image
./docker-run.sh build

# Start the container (if already built)
./docker-run.sh start

# Stop the container
./docker-run.sh stop

# Restart the container
./docker-run.sh restart

# View logs
./docker-run.sh logs

# Rebuild and restart
./docker-run.sh rebuild

# Show container status
./docker-run.sh status

# Clean up Docker resources
./docker-run.sh cleanup
```

## Docker Compose Commands

You can also use docker-compose directly:

```bash
# Start services
docker-compose up -d

# Start with development profile
docker-compose --profile dev up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# View running services
docker-compose ps
```

## Container Architecture

### Production Container
- **Base Image**: Node.js 18 Alpine (lightweight)
- **Port**: 3000
- **User**: Non-root (nodejs:1001)
- **Health Check**: Automatic health monitoring
- **Restart Policy**: Unless stopped

### Development Container
- **Features**: Hot reloading, source code mounting
- **Ports**: 3001 (backend), 5173 (frontend)
- **Volumes**: Source code mounted for live updates

## Volume Mounts

- **Database**: `./database:/app/database:ro` (read-only)
- **Logs**: `./logs:/app/logs` (optional)
- **Source Code**: Mounted in development mode for hot reloading

## Environment Variables

- `NODE_ENV`: production/development
- `PORT`: Application port (default: 3000)

## Health Monitoring

The container includes automatic health checks:
- **Interval**: Every 30 seconds
- **Timeout**: 3 seconds
- **Retries**: 3 attempts
- **Start Period**: 5 seconds grace period

## Security Features

- **Non-root User**: Application runs as `nodejs` user (UID 1001)
- **Signal Handling**: Uses `dumb-init` for proper process management
- **Read-only Database**: Database mounted as read-only
- **Alpine Linux**: Minimal attack surface

## Troubleshooting

### Container Won't Start

1. Check if Docker is running:
   ```bash
   docker info
   ```

2. Verify database exists:
   ```bash
   ls -la ./database/market_data.db
   ```

3. Check container logs:
   ```bash
   ./docker-run.sh logs
   ```

### Port Already in Use

If port 3000 is already in use, modify the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Use port 3001 instead
```

### Build Issues

1. Clean up and rebuild:
   ```bash
   ./docker-run.sh cleanup
   ./docker-run.sh rebuild
   ```

2. Check Docker disk space:
   ```bash
   docker system df
   ```

### Performance Issues

1. Increase Docker resources in Docker Desktop settings
2. Ensure adequate RAM allocation (minimum 2GB)
3. Use SSD storage for better I/O performance

## Production Deployment

### Single Host Deployment

```bash
# Build and run
./docker-run.sh run

# Set up reverse proxy (nginx example)
# Configure nginx to proxy requests to localhost:3000
```

### Multi-Host Deployment

1. Build and push the image to a registry:
   ```bash
   docker build -t your-registry/stock-analysis-webapp:latest .
   docker push your-registry/stock-analysis-webapp:latest
   ```

2. Update `docker-compose.yml` to use the registry image:
   ```yaml
   image: your-registry/stock-analysis-webapp:latest
   ```

3. Deploy on target hosts using docker-compose

### Environment-Specific Configuration

Create environment-specific compose files:

```bash
# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

## Monitoring and Logging

### View Real-time Logs

```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f stock-analysis-app

# View last N lines
docker-compose logs --tail=100
```

### Container Health

```bash
# Check container status
docker-compose ps

# View health check results
docker inspect stock-analysis-webapp | grep -A 10 Health
```

### Resource Usage

```bash
# View container resource usage
docker stats stock-analysis-webapp

# View disk usage
docker system df
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker exec stock-analysis-webapp sqlite3 /app/database/market_data.db ".backup /app/database/backup_$(date +%Y%m%d_%H%M%S).db"

# Copy backup from container
docker cp stock-analysis-webapp:/app/database/backup_*.db ./
```

### Container Backup

```bash
# Save container image
docker save stock-analysis-webapp > stock-analysis-webapp.tar

# Load container image
docker load < stock-analysis-webapp.tar
```

## Updates and Maintenance

### Update Application

1. Pull latest code
2. Rebuild and restart:
   ```bash
   ./docker-run.sh rebuild
   ```

### Update Dependencies

1. Update package.json files
2. Rebuild container:
   ```bash
   ./docker-run.sh rebuild
   ```

### Clean Up Old Images

```bash
# Remove unused images
docker image prune -f

# Remove all unused resources
docker system prune -a
```

## Support

If you encounter issues:

1. Check the logs: `./docker-run.sh logs`
2. Verify Docker is running: `docker info`
3. Check container status: `./docker-run.sh status`
4. Review this documentation for troubleshooting steps

## Next Steps

- [Main README](../README.md) - Project overview and features
- [PROJECT_RULES](../PROJECT_RULES.md) - Development guidelines
- [API Documentation](../README.md#api-endpoints) - Backend API reference
