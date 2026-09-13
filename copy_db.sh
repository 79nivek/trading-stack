#!/bin/bash

# ==========================================
# Script to copy binance_backtest database
# from 10.0.40.117 to localhost using Docker
# ==========================================

# Source database configuration (from trading.ts)
SRC_HOST="10.0.40.117"
SRC_PORT="5432"
SRC_USER="postgres"
SRC_PASS="jSQGCscokz6ErQaMfe9ZMG4cRcEtHVl2ZrS"
SRC_DB="binance_backtest"

# Destination database configuration (localhost)
# Since we are using Docker Desktop for Mac, we use host.docker.internal to access the host's localhost
DEST_HOST="host.docker.internal"
DEST_PORT="5432"
DEST_USER="postgres" # Change if your local postgres user is different
DEST_PASS="guYGpMSkIwMEgFi1dDoPgB2EaPc5mM" # Uncomment and set if your local DB requires a password

echo "Starting database migration using Docker..."
echo "Source: $SRC_HOST:$SRC_PORT/$SRC_DB"
echo "Destination: localhost:$DEST_PORT (via host.docker.internal)"

# Use Docker to run pg_dump and psql
# We pipe the output directly to the second container running psql connected to the 'postgres' default database

if [ -n "$DEST_PASS" ]; then
  # If local db has password
  docker run --rm -e PGPASSWORD="$SRC_PASS" postgres pg_dump -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -C -c --if-exists "$SRC_DB" | \
  docker run --rm -i -e PGPASSWORD="$DEST_PASS" postgres psql -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d postgres
else
  # If local db has no password or uses peer/ident authentication
  docker run --rm -e PGPASSWORD="$SRC_PASS" postgres pg_dump -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -C -c --if-exists "$SRC_DB" | \
  docker run --rm -i postgres psql -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d postgres
fi

if [ $? -eq 0 ]; then
  echo "✅ Database copy completed successfully!"
else
  echo "❌ Error occurred during database copy."
fi
