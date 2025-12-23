from datetime import timedelta
from minio import Minio
from app.config import settings

# 1. SETUP CLIENTS
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)

signer_client = Minio(
    "localhost:9100", # External address for browser
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
    region="us-east-1",
)

# 2. DEFINE BUCKETS
RAW_BUCKET = "raw-datasets"
PROCESSED_BUCKET = "processed-datasets" # 👈 New Bucket

# 3. CREATE BUCKETS AUTOMATICALLY
def ensure_bucket():
    # Check Raw Bucket
    if not minio_client.bucket_exists(RAW_BUCKET):
        minio_client.make_bucket(RAW_BUCKET)
        print(f"✅ Created bucket: {RAW_BUCKET}")

    # Check Processed Bucket
    if not minio_client.bucket_exists(PROCESSED_BUCKET):
        minio_client.make_bucket(PROCESSED_BUCKET)
        print(f"✅ Created bucket: {PROCESSED_BUCKET}")

def generate_presigned_upload_url(object_key: str):
    return signer_client.presigned_put_object(
        bucket_name=RAW_BUCKET,
        object_name=object_key,
        expires=timedelta(hours=1),
    )