#!/bin/bash

# Example script to run the n8n-copier Docker container
# Replace the environment variable values with your actual values

docker run -d \
  --name n8n-copier \
  -p 8000:8000 \
  -e SOURCE_N8N_URL="https://your-source-n8n-instance.com" \
  -e SOURCE_API_KEY="your-source-api-key-here" \
  -e DESTINATION_N8N_URL="https://your-destination-n8n-instance.com" \
  -e DESTINATION_API_KEY="your-destination-api-key-here" \
  -e RESEND_API_KEY="your-resend-api-key-here" \
  n8n-copier:latest

echo "n8n-copier container started!"
echo "Access the application at http://localhost:8000"
echo ""
echo "To view logs: docker logs n8n-copier"
echo "To stop: docker stop n8n-copier"
echo "To remove: docker rm n8n-copier"