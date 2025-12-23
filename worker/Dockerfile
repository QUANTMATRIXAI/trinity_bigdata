FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && apt-get clean

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

COPY backend /app/backend
COPY worker /app/worker
COPY shared /app/shared

ENV PYTHONPATH=/app

CMD ["celery", "-A", "worker.worker", "worker", "--loglevel=INFO"]
