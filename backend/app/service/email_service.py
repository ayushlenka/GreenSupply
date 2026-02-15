import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


async def send_group_confirmed_email(recipients: list[str], group_id: str) -> bool:
    settings = get_settings()
    if not recipients:
        return False
    if not settings.smtp_host or not settings.smtp_from_email:
        return False

    def _send() -> bool:
        msg = EmailMessage()
        msg["Subject"] = f"GreenSupply Group Order Confirmed ({group_id})"
        msg["From"] = settings.smtp_from_email
        msg["To"] = ", ".join(recipients)
        msg.set_content(
            "Your group order has reached the confirmation threshold and is now confirmed. "
            "Please check your dashboard for details."
        )

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
        return True

    try:
        return await asyncio.to_thread(_send)
    except Exception:
        return False
