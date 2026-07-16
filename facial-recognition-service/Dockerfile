# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables to prevent Python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# CRITICAL FIX: Restrict CMake to 1 core so dlib compilation doesn't crash cloud builders (OOM)
ENV CMAKE_BUILD_PARALLEL_LEVEL=1

# Install system dependencies required for compiling CMake and dlib
# Note: Removed x11 and gtk as they are for GUI windows, which a headless FastAPI server doesn't need
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy requirements file first to leverage Docker build cache
COPY requirements.txt .

# Install dependencies (dlib compiles during this step, safely on 1 core)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the remaining service code
COPY . .

# Expose the API port
EXPOSE 8000

# Command to run FastAPI server under Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]