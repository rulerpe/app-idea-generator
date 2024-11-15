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

COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript files
COPY --from=builder /app/dist ./dist

# Use PORT environment variable provided by Cloud Run
ENV PORT=8080
EXPOSE ${PORT}

CMD ["node", "dist/main"]
