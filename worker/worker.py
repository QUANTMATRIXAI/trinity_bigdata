import os
import json
import tempfile
from minio import Minio

from shared.celery_app import celery_app
from shared.state import DATASETS
from app.config import settings

# ============================
# MinIO client
# ============================
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)

RAW_BUCKET = settings.MINIO_BUCKET_RAW
PARQUET_BUCKET = settings.MINIO_BUCKET_PARQUET
SUMMARY_BUCKET = settings.MINIO_BUCKET_SUMMARY


def download_from_minio(bucket, key, path):
    minio_client.fget_object(bucket, key, path)


def upload_to_minio(bucket, path, key):
    minio_client.fput_object(bucket, key, path)


@celery_app.task(bind=True, max_retries=3, name="worker.process_dataset")
def process_dataset(self, dataset_id: str, object_key: str, sheet_name=None):

    if dataset_id not in DATASETS:
        DATASETS[dataset_id] = {"status": "failed", "error": "Invalid dataset_id"}
        return

    DATASETS[dataset_id]["status"] = "processing"

    try:
        tmp_raw = tempfile.NamedTemporaryFile(delete=False).name
        download_from_minio(RAW_BUCKET, object_key, tmp_raw)

        # ⚠️ placeholder logic
        summary = {
            "rows": 0,
            "columns": 0,
        }

        tmp_summary = tempfile.NamedTemporaryFile(delete=False).name
        with open(tmp_summary, "w") as f:
            json.dump(summary, f)

        upload_to_minio(SUMMARY_BUCKET, tmp_summary, f"{dataset_id}.json")

        DATASETS[dataset_id]["status"] = "processed"
        DATASETS[dataset_id]["summary"] = summary

        return summary

    except Exception as e:
        DATASETS[dataset_id]["status"] = "failed"
        DATASETS[dataset_id]["error"] = str(e)
        raise self.retry(exc=e, countdown=5)
