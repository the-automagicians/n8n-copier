# n8n Workflow Copier

A web-based tool for copying n8n workflows between instances with deployment tracking, overwrite protection, and change logging.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.68+-green.svg)

## Overview

The n8n Workflow Copier is a lightweight web application that simplifies the process of copying workflows from one n8n instance to another. It provides a user-friendly interface for selecting workflows, reviewing changes, and safely deploying them with proper documentation and overwrite protection.

### Key Features

- **Workflow Discovery**: Automatically fetches and lists all active workflows from your source n8n instance
- **Smart Filtering**: Excludes workflows with pinned data to prevent accidental deployment of test data
- **Side-by-Side Comparison**: View original and cleaned workflow JSON before deployment
- **Deployment Tracking**: Requires deployment reason for audit trail
- **Overwrite Protection**: Warns when overwriting existing workflows and requires confirmation
- **Sticky Note Integration**: Extracts and displays special sticky notes (marked with `#!#`) from destination workflows
- **Intelligent API Usage**: Uses POST for new workflows, PUT for updates
- **Real-time Feedback**: Clear success/error messages with detailed response information

## Tech Stack

### Backend
- **FastAPI**: Modern, fast Python web framework for building APIs
- **Python 3.8+**: Core programming language
- **Requests**: HTTP library for n8n API communication
- **python-dotenv**: Environment variable management

### Frontend
- **Vanilla JavaScript (ES5)**: No frameworks, maximum compatibility
- **HTML5/CSS3**: Clean, responsive UI
- **Fetch API**: Modern HTTP requests from the browser

### Architecture

The application follows a clean separation of concerns:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   FastAPI    │ ◄─────► │  n8n APIs   │
│  (Frontend) │  HTTP   │   (Backend)  │  HTTP   │  (Source &  │
│             │         │              │         │ Destination)│
└─────────────┘         └──────────────┘         └─────────────┘
```

**Why This Stack?**

1. **FastAPI**: Chosen for its automatic API documentation, type safety, and excellent performance
2. **Vanilla JS**: No build step required, easy to modify, works everywhere
3. **Environment Variables**: Secure credential management without hardcoding
4. **RESTful Design**: Clean API endpoints that mirror n8n's API structure

## Project Structure

```
n8n-copier/
├── backend/
│   ├── main.py              # FastAPI application with all API endpoints
│   └── __pycache__/         # Python cache (auto-generated)
├── frontend/
│   ├── index.html           # Main HTML page
│   ├── script.js            # Frontend JavaScript logic
│   └── style.css            # Styling
├── .env                     # Environment variables (credentials)
├── .env.template            # Template for environment setup
├── README.md                # This file
├── DEPLOYMENT.md            # Deployment guide
└── requirements.txt         # Python dependencies
```

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Access to source and destination n8n instances
- n8n API keys for both instances

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/n8n-copier.git
   cd n8n-copier
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.template .env
   # Edit .env with your actual credentials
   ```

4. **Start the application**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

5. **Open your browser**
   ```
   http://127.0.0.1:8000
   ```

## Configuration

Create a `.env` file in the project root with the following variables:

```ini
SOURCE_N8N_URL="https://your-source-n8n.com"
SOURCE_API_KEY="your-source-api-key"
DESTINATION_N8N_URL="https://your-destination-n8n.com"
DESTINATION_API_KEY="your-destination-api-key"
```

### Getting n8n API Keys

1. Log into your n8n instance
2. Go to **Settings** → **API**
3. Click **Create API Key**
4. Copy the key (you won't be able to see it again!)
5. Repeat for both source and destination instances

## Usage

### Step 1: Connect and Select
1. Click "Connect & Fetch Workflows"
2. Select a workflow from the list
3. Enter a deployment reason (required for audit trail)
4. Click "Continue"

### Step 2: Review
- View the original workflow JSON (left panel)
- View the cleaned workflow JSON ready for deployment (right panel)
- Review destination status:
  - **Yellow box**: Workflow doesn't exist, will be created
  - **Red box**: Workflow exists, will be overwritten (shows sticky notes with `#!#`)

### Step 3: Deploy
- Click "Continue with Copying" (green) for new workflows
- Click "Confirm Overwrite" (red) for existing workflows
- Confirm the action in the dialog
- View success message with deployment details

## How It Works

### Workflow Cleaning Process

When fetching a workflow from the source, the application removes metadata fields that are auto-generated by n8n:

**Removed fields:**
- `id` (will be auto-assigned)
- `createdAt`, `updatedAt` (timestamps)
- `versionId` (version control)
- `active` (read-only field)
- Any other n8n-managed metadata

**Kept fields:**
- `name` (workflow name)
- `nodes` (workflow logic)
- `connections` (node relationships)
- `settings` (workflow configuration)
- `staticData` (persistent data)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the main HTML page |
| `/script.js` | GET | Serves the JavaScript file |
| `/style.css` | GET | Serves the CSS file |
| `/api/workflows` | GET | Lists all active workflows from source |
| `/api/workflow/{id}` | GET | Fetches full workflow details (original + cleaned) |
| `/api/check-destination/{id}` | GET | Checks if workflow exists on destination |
| `/api/copy-workflow` | POST | Copies workflow (POST for new, PUT for updates) |

### Sticky Note Feature

The application looks for sticky notes in destination workflows with `#!#` in their name. This is useful for:
- Deployment notes
- Configuration reminders
- Environment-specific instructions
- Change logs

Example sticky note name: `#!# Production Config Notes`

## Development

### Running in Development Mode

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag enables auto-restart on code changes.

### Testing API Endpoints

FastAPI provides automatic interactive API documentation:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including:
- Production server setup
- VPS deployment
- Docker containerization
- Nginx reverse proxy configuration
- SSL/TLS setup

## Security Considerations

- **Never commit `.env` files** to version control
- Store API keys securely
- Use HTTPS in production
- Consider IP whitelisting for production deployments
- Rotate API keys regularly
- Use read-only API keys for source if possible

## Troubleshooting

### "Failed to fetch workflows"
- Check that SOURCE_N8N_URL is correct and accessible
- Verify SOURCE_API_KEY is valid
- Ensure n8n API is enabled

### "Failed to copy workflow"
- Check DESTINATION_API_KEY has write permissions
- Verify workflow JSON is valid
- Check n8n logs for detailed error messages

### Button doesn't work
- Open browser console (F12) and check for JavaScript errors
- Ensure script.js is loading correctly
- Clear browser cache

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for the n8n community
- Inspired by the need for safe, documented workflow deployments
- Thanks to the FastAPI and n8n teams for excellent documentation

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the n8n API documentation: https://docs.n8n.io/api/

## Roadmap

- [ ] Deployment history logging
- [ ] Batch workflow copying
- [ ] Workflow diff visualization
- [ ] Rollback functionality
- [ ] Multi-environment support
- [ ] Scheduled deployments
- [ ] Slack/Discord notifications

---

**Made with ❤️ for the n8n community**

