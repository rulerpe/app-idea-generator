#!/bin/sh

# Wait for a moment to ensure database is ready
sleep 5

echo "Running database migrations..."
# Run migrations using TypeORM CLI with correct paths
NODE_ENV=production typeorm-ts-node-commonjs migration:run \
  --dataSource dist/config/typeorm.config.js \
  --migrationsDir src/migrations

echo "Starting application..."
# Start the application
node dist/main
