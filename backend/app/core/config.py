from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Pagos"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./pagos.db"
    jwt_secret_key: str = "dev-only-secret-change-me"
    jwt_expire_minutes: int = 480
    default_admin_username: str = "admin"
    default_admin_password: str = "admin123"
    default_admin_full_name: str = "Administrador"
    default_user_username: str = "usuario"
    default_user_password: str = "usuario123"
    default_user_full_name: str = "Usuario Base"
    frontend_origins_raw: str = ",".join(
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins_raw.split(",") if origin.strip()]


settings = Settings()
