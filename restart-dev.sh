#!/bin/bash

echo "🔧 Restarting AssistMe Dev Server..."
echo ""

cd /Users/mangeshraut/Downloads/AssistMe-VirtualAssistant

# Kill any existing dev server
echo "Stopping existing dev server..."
pkill -f "vite.*5173" || echo "No existing server found"

# Clear Vite cache
echo "Clearing Vite cache..."
rm -rf frontend/node_modules/.vite

# Start dev server
echo "Starting fresh dev server..."
npm run dev

echo "✅ Dev server should now be running at http://localhost:5173"
