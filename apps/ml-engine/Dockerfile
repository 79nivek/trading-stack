# Use an official Python runtime as a parent image
FROM --platform=$TARGETPLATFORM python:3.12-slim

# Install uv for fast package management
RUN pip install uv

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set work directory
WORKDIR /app

# Copy the dependency specification
COPY requirements.txt /app/

# Install dependencies using uv
RUN uv pip install --system -r requirements.txt

# Copy the rest of the application
COPY . /app

# Expose port
EXPOSE 8000

# Run the application (dev mode using fastapi run for live reload, but we'll override in docker-compose for dev)
CMD ["fastapi", "run", "src/main.py", "--port", "8000", "--host", "0.0.0.0"]
