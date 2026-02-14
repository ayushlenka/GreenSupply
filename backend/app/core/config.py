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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
