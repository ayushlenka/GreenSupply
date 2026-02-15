from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GreenSupply API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    # Supabase/Postgres connection string format:
    # postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DBNAME
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/greensupply"

    # Optional for future Supabase client usage
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_audience: str = "authenticated"
    baseline_delivery_miles: float = 5.0
    consolidated_delivery_miles: float = 8.0
    city_projection_businesses: int = 1000
    db_init_on_startup: bool = True
    db_init_strict: bool = False
    db_connect_timeout_seconds: int = 10
    db_ssl_verify: bool = True
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash-lite"
    google_maps_api_key: str = ""
    group_default_min_businesses_required: int = 5
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
