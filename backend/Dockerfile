# Lightest stable Python base for FastAPI
FROM python:3.11-slim

# Set working directory
WORKDIR /backend

# Prevent Python from writing .pyc files + enable better logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (required for openpyxl, polars, pyarrow)
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    curl \
    && apt-get clean

# Copy requirements (create this file if not present)
COPY requirements.txt /backend/requirements.txt

# Install Python dependencies
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy application source
COPY . /backend

# Expose FastAPI port
EXPOSE 8000

# Default command (docker-compose overrides with --reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
