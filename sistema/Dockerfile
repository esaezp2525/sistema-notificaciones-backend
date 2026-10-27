FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PORT=5829 \
    HEADLESS=true

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY . .

EXPOSE 5829

CMD ["python", "server.py"]
