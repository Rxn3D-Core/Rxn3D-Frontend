#!/bin/bash

# Make this script executable with: chmod +x docker-scripts.sh

case "$1" in
  build)
    echo "Building Docker image..."
    docker build -t rxn3d_frontend .
    ;;
  run)
    echo "Running Docker container..."
    docker run -p 3000:3000 --env-file .env rxn3d_frontend
    ;;
  compose-up)
    echo "Starting with Docker Compose..."
    docker-compose up -d
    ;;
  compose-down)
    echo "Stopping Docker Compose services..."
    docker-compose down
    ;;
  *)
    echo "Usage: $0 {build|run|compose-up|compose-down}"
    exit 1
esac

exit 0
