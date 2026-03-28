from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    JOBS_DIR: str = "./jobs"
    DB_PATH: str = "./db/huddletag.db"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
