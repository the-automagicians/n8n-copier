# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# n8n Source Instance Configuration
ENV SOURCE_N8N_URL="https://your-source-n8n-instance.com"
ENV SOURCE_API_KEY="your-source-api-key-here"

# n8n Destination Instance Configuration
ENV DESTINATION_N8N_URL="https://your-destination-n8n-instance.com"
ENV DESTINATION_API_KEY="your-destination-api-key-here"

# RESEND email key
ENV RESEND_API_KEY="your-resend-api-key-here"



# Expose port 8000
EXPOSE 8000

# Change to backend directory and run the application
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
