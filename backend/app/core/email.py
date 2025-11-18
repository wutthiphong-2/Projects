import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from jinja2 import Template
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

# Email templates directory
TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "email"


class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = getattr(settings, 'SMTP_HOST', 'localhost')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.smtp_use_tls = getattr(settings, 'SMTP_USE_TLS', True)
        self.from_email = getattr(settings, 'SMTP_FROM_EMAIL', 'noreply@example.com')
        self.from_name = getattr(settings, 'SMTP_FROM_NAME', 'API Management')
    
    def _get_smtp_config(self, smtp_override: Optional[dict] = None) -> dict:
        """Get SMTP configuration with optional override"""
        if smtp_override:
            return {
                'smtp_host': smtp_override.get('smtp_host') or self.smtp_host,
                'smtp_port': smtp_override.get('smtp_port') or self.smtp_port,
                'smtp_username': smtp_override.get('smtp_username') or self.smtp_username,
                'smtp_password': smtp_override.get('smtp_password') or self.smtp_password,
                'smtp_use_tls': smtp_override.get('smtp_use_tls') if smtp_override.get('smtp_use_tls') is not None else self.smtp_use_tls,
                'from_email': smtp_override.get('from_email') or self.from_email,
                'from_name': smtp_override.get('from_name') or self.from_name,
            }
        return {
            'smtp_host': self.smtp_host,
            'smtp_port': self.smtp_port,
            'smtp_username': self.smtp_username,
            'smtp_password': self.smtp_password,
            'smtp_use_tls': self.smtp_use_tls,
            'from_email': self.from_email,
            'from_name': self.from_name,
        }
    
    def _load_template(self, template_name: str) -> Optional[Template]:
        """Load email template from file"""
        try:
            template_path = TEMPLATES_DIR / template_name
            if not template_path.exists():
                logger.warning(f"Template {template_name} not found, using default")
                return None
            
            with open(template_path, 'r', encoding='utf-8') as f:
                return Template(f.read())
        except Exception as e:
            logger.error(f"Error loading template {template_name}: {e}")
            return None
    
    def _send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        smtp_override: Optional[dict] = None
    ) -> bool:
        """Send email via SMTP with optional SMTP settings override"""
        try:
            # Get SMTP configuration (use override if provided)
            smtp_config = self._get_smtp_config(smtp_override)
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
            msg['To'] = ', '.join(to_emails)
            
            # Add plain text version if provided
            if text_body:
                text_part = MIMEText(text_body, 'plain', 'utf-8')
                msg.attach(text_part)
            
            # Add HTML version
            html_part = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Connect to SMTP server
            if smtp_config['smtp_use_tls']:
                server = smtplib.SMTP(smtp_config['smtp_host'], smtp_config['smtp_port'])
                server.starttls()
            else:
                server = smtplib.SMTP(smtp_config['smtp_host'], smtp_config['smtp_port'])
            
            # Authenticate if credentials provided
            if smtp_config['smtp_username'] and smtp_config['smtp_password']:
                server.login(smtp_config['smtp_username'], smtp_config['smtp_password'])
            
            # Send email
            server.send_message(msg)
            server.quit()
            
            logger.info(f"✅ Email sent successfully to {', '.join(to_emails)}")
            return True
        except Exception as e:
            logger.error(f"❌ Error sending email: {e}")
            return False
    
    def send_api_key_created(
        self,
        to_email: str,
        api_key_name: str,
        api_key: str,
        created_by: str,
        expires_at: Optional[str] = None,
        smtp_override: Optional[dict] = None
    ) -> bool:
        """Send email notification when API key is created"""
        try:
            template = self._load_template('api_key_created.html')
            
            if template:
                html_body = template.render(
                    api_key_name=api_key_name,
                    api_key=api_key,
                    created_by=created_by,
                    expires_at=expires_at
                )
            else:
                # Default template
                html_body = f"""
                <html>
                <body>
                    <h2>API Key Created</h2>
                    <p>Your API key <strong>{api_key_name}</strong> has been created successfully.</p>
                    <p><strong>API Key:</strong> <code>{api_key}</code></p>
                    <p><strong>Created by:</strong> {created_by}</p>
                    {f'<p><strong>Expires at:</strong> {expires_at}</p>' if expires_at else ''}
                    <p><strong>Important:</strong> Save this API key now. You won't be able to see it again.</p>
                </body>
                </html>
                """
            
            subject = f"API Key Created: {api_key_name}"
            return self._send_email([to_email], subject, html_body, smtp_override=smtp_override)
        except Exception as e:
            logger.error(f"Error sending API key created email: {e}")
            return False
    
    def send_api_key_shared(
        self,
        to_emails: List[str],
        api_key_name: str,
        shared_by: str,
        message: Optional[str] = None,
        api_base_url: str = "http://localhost:8000"
    ) -> bool:
        """Send email invitation to share API key"""
        try:
            template = self._load_template('api_key_shared.html')
            
            if template:
                html_body = template.render(
                    api_key_name=api_key_name,
                    shared_by=shared_by,
                    message=message,
                    api_base_url=api_base_url
                )
            else:
                # Default template
                html_body = f"""
                <html>
                <body>
                    <h2>API Key Shared with You</h2>
                    <p><strong>{shared_by}</strong> has shared access to the API key <strong>{api_key_name}</strong> with you.</p>
                    {f'<p><strong>Message:</strong> {message}</p>' if message else ''}
                    <p>To use this API key, please contact {shared_by} or visit the API Management portal.</p>
                    <p>API Base URL: <code>{api_base_url}</code></p>
                </body>
                </html>
                """
            
            subject = f"API Key Shared: {api_key_name}"
            return self._send_email(to_emails, subject, html_body)
        except Exception as e:
            logger.error(f"Error sending API key shared email: {e}")
            return False
    
    def send_api_key_to_self(
        self,
        to_email: str,
        api_key_name: str,
        api_key: str,
        message: Optional[str] = None
    ) -> bool:
        """Send API key to user's own email"""
        try:
            template = self._load_template('api_key_sent_to_self.html')
            
            if template:
                html_body = template.render(
                    api_key_name=api_key_name,
                    api_key=api_key,
                    message=message
                )
            else:
                # Default template
                html_body = f"""
                <html>
                <body>
                    <h2>Your API Key</h2>
                    <p>This is a copy of your API key <strong>{api_key_name}</strong>.</p>
                    <p><strong>API Key:</strong> <code>{api_key}</code></p>
                    {f'<p><strong>Note:</strong> {message}</p>' if message else ''}
                    <p><strong>Important:</strong> Keep this email secure. This API key provides access to your account.</p>
                </body>
                </html>
                """
            
            subject = f"Your API Key: {api_key_name}"
            return self._send_email([to_email], subject, html_body)
        except Exception as e:
            logger.error(f"Error sending API key to self email: {e}")
            return False


# Global instance
email_service = EmailService()

