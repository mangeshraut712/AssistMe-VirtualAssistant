#!/bin/bash

# AssistMe Quick Start Script
# This script helps you start all services and run tests

echo "=================================="
echo "AssistMe - Quick Start"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DEV_MODE_VALUE=$(printf '%s' "${DEV_MODE:-false}" | tr '[:upper:]' '[:lower:]')

if [ -z "${OPENROUTER_API_KEY}" ] && [ "${DEV_MODE_VALUE}" != "true" ]; then
    echo -e "${YELLOW}⚠ OpenRouter API key not detected.${NC}"
    echo "You can:"
    echo "  - Set OPENROUTER_API_KEY in your shell (recommended for local real-model dev)"
    echo "  - Or run with DEV_MODE=true for mock responses (no key required)"
    echo ""
fi

echo "What would you like to do?"
echo ""
echo "1) Start Backend (port 8001)"
echo "2) Start Frontend (port 5173)"
echo "3) Run Quick Checks"
echo "4) Start Both Servers"
echo "5) Full Check (Start backend + Run checks)"
echo "6) Check System Status"
echo "0) Exit"
echo ""
read -p "Enter choice [0-6]: " choice

case $choice in
    1)
        echo -e "${BLUE}Starting Backend...${NC}"
        cd backend || exit 1
        if [ -z "${OPENROUTER_API_KEY}" ] && [ "${DEV_MODE_VALUE}" != "true" ]; then
            echo -e "${YELLOW}⚠ Starting backend with DEV_MODE=true (no API key).${NC}"
            DEV_MODE=true python -m uvicorn app.main:app --reload --port 8001
        else
            python -m uvicorn app.main:app --reload --port 8001
        fi
        ;;
    2)
        echo -e "${BLUE}Starting Frontend...${NC}"
        npm run dev
        ;;
    3)
        echo -e "${BLUE}Running Quick Checks...${NC}"
        echo "1. Backend syntax check (python -m compileall backend/app)"
        python -m compileall backend/app
        echo ""
        echo "2. Frontend build (npm run build)"
        npm run build
        ;;
    4)
        echo -e "${BLUE}Starting Both Servers...${NC}"
        echo "Backend will start on port 8001"
        echo "Frontend will start on port 5173"
        echo ""
        echo "Press Ctrl+C to stop"
        echo ""
        
        # Start backend in background
        cd backend || exit 1
        if [ -z "${OPENROUTER_API_KEY}" ] && [ "${DEV_MODE_VALUE}" != "true" ]; then
            echo -e "${YELLOW}⚠ Starting backend with DEV_MODE=true (no API key).${NC}"
            DEV_MODE=true python -m uvicorn app.main:app --reload --port 8001 &
        else
            python -m uvicorn app.main:app --reload --port 8001 &
        fi
        BACKEND_PID=$!
        
        # Start frontend
        cd .. || exit 1
        npm run dev &
        FRONTEND_PID=$!
        
        # Wait for Ctrl+C
        trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
        wait
        ;;
    5)
        echo -e "${BLUE}Full Check Mode${NC}"
        echo "1. Starting backend..."
        cd backend || exit 1
        if [ -z "${OPENROUTER_API_KEY}" ] && [ "${DEV_MODE_VALUE}" != "true" ]; then
            echo -e "${YELLOW}⚠ Starting backend with DEV_MODE=true (no API key).${NC}"
            DEV_MODE=true python -m uvicorn app.main:app --reload --port 8001 &
        else
            python -m uvicorn app.main:app --reload --port 8001 &
        fi
        BACKEND_PID=$!
        sleep 5
        
        echo "2. Running checks..."
        cd .. || exit 1
        python -m compileall backend/app
        echo ""
        curl -fsS http://localhost:8001/health >/dev/null 2>&1 && echo -e "Health endpoint: ${GREEN}✓${NC}" || echo -e "Health endpoint: ${YELLOW}✗${NC}"
        
        echo "3. Cleaning up..."
        kill $BACKEND_PID
        ;;
    6)
        echo -e "${BLUE}System Status Check${NC}"
        echo ""
        
        # Check Python
        echo -n "Python: "
        python --version 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}✗ Not found${NC}"
        
        # Check Node
        echo -n "Node.js: "
        node --version 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}✗ Not found${NC}"
        
        # Check npm
        echo -n "npm: "
        npm --version 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}✗ Not found${NC}"
        
        # Check if ports are free
        echo ""
        echo "Port Status:"
        lsof -i :8001 >/dev/null 2>&1 && echo -e "Port 8001: ${YELLOW}In use${NC}" || echo -e "Port 8001: ${GREEN}Available${NC}"
        lsof -i :5173 >/dev/null 2>&1 && echo -e "Port 5173: ${YELLOW}In use${NC}" || echo -e "Port 5173: ${GREEN}Available${NC}"

        # Check configuration
        echo ""
        if [ -n "${OPENROUTER_API_KEY}" ]; then
            echo -e "OpenRouter API Key: ${GREEN}✓ Provided via environment${NC}"
        elif [ "${DEV_MODE_VALUE}" = "true" ]; then
            echo -e "DEV_MODE: ${GREEN}true${NC} (mock responses, no API key required)"
        else
            echo -e "OpenRouter API Key: ${YELLOW}⚠ Not set${NC}"
            echo -e "DEV_MODE: ${YELLOW}${DEV_MODE_VALUE}${NC}"
        fi
        
        echo ""
        echo "Documentation:"
        [ -f "TESTING_CHECKLIST.md" ] && echo -e "Testing Guide: ${GREEN}✓${NC}" || echo -e "Testing Guide: ${YELLOW}✗${NC}"
        [ -f "DEPLOYMENT_GUIDE.md" ] && echo -e "Deployment Guide: ${GREEN}✓${NC}" || echo -e "Deployment Guide: ${YELLOW}✗${NC}"
        [ -f "README.md" ] && echo -e "README: ${GREEN}✓${NC}" || echo -e "README: ${YELLOW}✗${NC}"
        ;;
    0)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
