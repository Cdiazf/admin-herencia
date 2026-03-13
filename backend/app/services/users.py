from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def seed_default_users(db: Session) -> None:
    defaults = [
        {
            "username": settings.default_admin_username,
            "full_name": settings.default_admin_full_name,
            "password": settings.default_admin_password,
            "role": "admin",
        },
        {
            "username": settings.default_user_username,
            "full_name": settings.default_user_full_name,
            "password": settings.default_user_password,
            "role": "user",
        },
    ]

    created = False
    for item in defaults:
        existing = db.scalar(select(User).where(User.username == item["username"]))
        if existing:
            continue

        db.add(
            User(
                username=item["username"],
                full_name=item["full_name"],
                password_hash=hash_password(item["password"]),
                role=item["role"],
                is_active=True,
            )
        )
        created = True

    if created:
        db.commit()
