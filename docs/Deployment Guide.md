# Deployment Guide

This guide covers various deployment scenarios for the n8n Workflow Copier.

## Table of Contents

- [Local Development](#local-development)
- [VPS Deployment](#vps-deployment)
- [Docker Deployment](#docker-deployment)
- [Production Considerations](#production-considerations)

---

## Local Development

### Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.template .env
# Edit .env with your credentials

# Run the server
cd backend
uvicorn main:app --reload
```

Access at: `http://127.0.0.1:8000`

---

## VPS Deployment

### Prerequisites

- Ubuntu 20.04+ (or similar Linux distribution)
- Root or sudo access
- Domain name (optional, but recommended)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install nginx (for reverse proxy)
sudo apt install nginx -y

# Install certbot (for SSL)
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/n8n-copier
cd /var/www/n8n-copier

# Clone or upload your application
git clone https://github.com/yourusername/n8n-copier.git .

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.template .env
nano .env  # Edit with your credentials
```

### Step 3: Create Systemd Service

Create `/etc/systemd/system/n8n-copier.service`:

```ini
[Unit]
Description=n8n Workflow Copier
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/n8n-copier/backend
Environment="PATH=/var/www/n8n-copier/venv/bin"
ExecStart=/var/www/n8n-copier/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable n8n-copier
sudo systemctl start n8n-copier
sudo systemctl status n8n-copier
```

### Step 4: Configure Nginx

Create `/etc/nginx/sites-available/n8n-copier`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/n8n-copier /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Setup SSL (Optional but Recommended)

```bash
sudo certbot --nginx -d your-domain.com
```

Follow the prompts. Certbot will automatically configure SSL and set up auto-renewal.

### Step 6: Firewall Configuration

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY .env .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  n8n-copier:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
```

### Build and Run

```bash
# Build the image
docker-compose build

# Run the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

---

## Production Considerations

### Security

1. **Environment Variables**
   - Never commit `.env` to version control
   - Use secrets management in production (e.g., AWS Secrets Manager, HashiCorp Vault)

2. **API Keys**
   - Rotate regularly
   - Use read-only keys for source when possible
   - Monitor API usage

3. **Network Security**
   - Use HTTPS only
   - Consider IP whitelisting
   - Implement rate limiting

4. **Application Security**
   - Keep dependencies updated: `pip list --outdated`
   - Run security audits: `pip-audit`
   - Use a Web Application Firewall (WAF)

### Performance

1. **Uvicorn Workers**
   ```bash
   uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
   ```

2. **Nginx Caching**
   Add to nginx config:
   ```nginx
   location /static/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Connection Pooling**
   Update `main.py` to use a session:
   ```python
   import requests
   session = requests.Session()
   # Use session.get() instead of requests.get()
   ```

### Monitoring

1. **Application Logs**
   ```bash
   # View systemd logs
   sudo journalctl -u n8n-copier -f
   ```

2. **Nginx Logs**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Health Check Endpoint**
   Add to `main.py`:
   ```python
   @app.get("/health")
   def health_check():
       return {"status": "healthy"}
   ```

### Backup

1. **Configuration Backup**
   ```bash
   # Backup .env file
   cp .env .env.backup.$(date +%Y%m%d)
   ```

2. **Deployment Logs**
   Consider adding a database or file-based logging for deployment history

### Scaling

For high-traffic scenarios:

1. **Load Balancing**
   - Use multiple uvicorn workers
   - Deploy multiple instances behind a load balancer

2. **Caching**
   - Cache workflow lists with Redis
   - Implement request deduplication

3. **Database**
   - Add PostgreSQL for deployment history
   - Store audit logs persistently

---

## Updating the Application

### Manual Update

```bash
cd /var/www/n8n-copier
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart n8n-copier
```

### Automated Updates

Create a deployment script `deploy.sh`:

```bash
#!/bin/bash
set -e

cd /var/www/n8n-copier
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart n8n-copier

echo "Deployment completed successfully"
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status n8n-copier

# View detailed logs
sudo journalctl -u n8n-copier -n 50 --no-pager

# Test manually
cd /var/www/n8n-copier/backend
source ../venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Nginx 502 Bad Gateway

```bash
# Check if application is running
sudo systemctl status n8n-copier

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify port is listening
sudo netstat -tlnp | grep 8000
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/n8n-copier

# Fix permissions
sudo chmod -R 755 /var/www/n8n-copier
```

---

## Support

For deployment issues:
1. Check the logs first
2. Review this guide
3. Open an issue on GitHub with:
   - Your deployment method
   - Error messages
   - System information

---

**Happy Deploying! 🚀**

