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

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠ Warning: No .env file found${NC}"
    echo "Creating .env template..."
    cat > .env << EOF
# Required: Get from https://openrouter.ai/keys
OPENROUTER_API_KEY=your_key_here

# Optional: For image generation
OPENAI_API_KEY=your_openai_key_here

# Optional: For better web search
TAVILY_API_KEY=your_tavily_key_here

# Development mode
DEV_MODE=false
EOF
    echo -e "${GREEN}✓ Created .env template${NC}"
    echo -e "${YELLOW}⚠ Please add your API keys to .env file${NC}"
    echo ""
fi

echo "What would you like to do?"
echo ""
echo "1) Start Backend (port 8001)"
echo "2) Start Frontend (port 5173)"
echo "3) Run Automated Tests"
echo "4) Start Both Servers"
echo "5) Full Test (Start servers + Run tests)"
echo "6) Check System Status"
echo "0) Exit"
echo ""
read -p "Enter choice [0-6]: " choice

case $choice in
    1)
        echo -e "${BLUE}Starting Backend...${NC}"
        cd backend
        python -m uvicorn app.main:app --reload --port 8001
        ;;
    2)
        echo -e "${BLUE}Starting Frontend...${NC}"
        cd frontend
        npm run dev
        ;;
    3)
        echo -e "${BLUE}Running Tests...${NC}"
        cd backend
        python test_all_models.py
        ;;
    4)
        echo -e "${BLUE}Starting Both Servers...${NC}"
        echo "Backend will start on port 8001"
        echo "Frontend will start on port 5173"
        echo ""
        echo "Press Ctrl+C to stop"
        echo ""
        
        # Start backend in background
        cd backend
        python -m uvicorn app.main:app --reload --port 8001 &
        BACKEND_PID=$!
        
        # Start frontend
        cd ../frontend
        npm run dev &
        FRONTEND_PID=$!
        
        # Wait for Ctrl+C
        trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
        wait
        ;;
    5)
        echo -e "${BLUE}Full Test Mode${NC}"
        echo "1. Starting backend..."
        cd backend
        python -m uvicorn app.main:app --reload --port 8001 &
        BACKEND_PID=$!
        sleep 5
        
        echo "2. Running tests..."
        python test_all_models.py
        
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
        
        # Check .env
        echo ""
        if [ -f ".env" ] || [ -f ".env.local" ]; then
            echo -e ".env file: ${GREEN}✓ Found${NC}"
            
            # Check for API key (without showing it)
            if grep -q "OPENROUTER_API_KEY=sk-" .env 2>/dev/null || grep -q "OPENROUTER_API_KEY=sk-" .env.local 2>/dev/null; then
                echo -e "OpenRouter API Key: ${GREEN}✓ Configured${NC}"
            else
                echo -e "OpenRouter API Key: ${YELLOW}⚠ Not configured${NC}"
            fi
        else
            echo -e ".env file: ${YELLOW}✗ Not found${NC}"
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
