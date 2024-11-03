# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies and TypeORM CLI dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm install -g typescript ts-node typeorm

# Copy compiled JavaScript files, migrations, and config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/migrations ./src/migrations
COPY start.sh ./start.sh

# Make start script executable
RUN chmod +x ./start.sh

# Use PORT environment variable provided by Cloud Run
ENV PORT=8080
EXPOSE ${PORT}

CMD ["./start.sh"]
