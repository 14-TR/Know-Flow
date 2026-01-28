#!/bin/bash
# Know-Flow Launcher for Mac/Linux Users
# Run: ./start-knowflow.sh

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please copy .env.user.example to .env and edit it with:"
    echo "  - Your username"
    echo "  - Path to the shared admin templates"
    echo ""
    exit 1
fi

echo "Starting Know-Flow..."
echo ""
docker-compose -f docker-compose.user.yml up --build
