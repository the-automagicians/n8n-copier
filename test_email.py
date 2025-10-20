import resend
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=".env")
resend.api_key = os.getenv("RESEND_API_KEY")

print(f"API Key loaded: {resend.api_key[:10]}..." if resend.api_key else "No API key found")

try:
    params = {
        "from": "noreply@imagoplatform.ai",
        "to": ["patrik@automagicians.io"],
        "subject": "Test Email",
        "html": "<strong>Test email from n8n copier</strong>",
    }
    
    email = resend.Emails.send(params)
    print(f"Email sent successfully: {email}")
except Exception as e:
    print(f"Error sending email: {e}")
