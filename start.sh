#!/bin/sh

echo "Starting database setup..."

# Wait for a moment to ensure database is ready
sleep 5

echo "Environment variables:"
echo "NODE_ENV: $NODE_ENV"
echo "DB_HOST: $DB_HOST"
echo "DB_NAME: $DB_NAME"
echo "CLOUD_SQL_CONNECTION_NAME: $CLOUD_SQL_CONNECTION_NAME"

echo "Listing migration files:"
ls -la src/migrations
ls -la dist/config

echo "Running database migrations..."
# Run migrations using TypeORM CLI with verbose output
NODE_ENV=production typeorm-ts-node-commonjs migration:run \
  --dataSource dist/config/typeorm.config.js \
  --migrationsDir src/migrations \
  -v

echo "Migration command completed."

echo "Starting application..."
# Start the application
node dist/main
