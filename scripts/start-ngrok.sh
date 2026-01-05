#!/bin/bash
# Start ngrok tunnel for local QStash testing
# This exposes your local Flask backend (port 5001) to the internet

echo "Starting ngrok tunnel for port 5001..."
echo ""
echo "Once started, copy the 'Forwarding' HTTPS URL and set it as FRONTEND_URL in backend/.env"
echo "Example: FRONTEND_URL=https://abc123.ngrok-free.app"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

ngrok http 5001

