#!/bin/bash
echo "Adding all changes..."
git add -A
echo "Committing changes..."
git commit -m "Fix JavaScript syntax errors and backend deployment issues

- Fix malformed parentheses in createVoiceUI() function
- Move logger definition before usage in voice_websocket.py
- Fix multimodal dispatch bug and function signatures
- Update start.sh to cd to backend directory for Railway deployment
- Optimize production requirements to exclude heavy ML libs
- Clear cached Python bytecode for clean startup"
echo "Pushing to GitHub..."
git push origin main
echo "Done!"
