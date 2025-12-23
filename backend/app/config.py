from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dataset Uploader"
    API_PREFIX: str = "/api"

    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_SECURE: bool = False

    MINIO_BUCKET_RAW: str = "raw-datasets"
    MINIO_BUCKET_PARQUET: str = "parquet-datasets"
    MINIO_BUCKET_SUMMARY: str = "dataset-summaries"

    class Config:
        env_file = ".env"

settings = Settings()