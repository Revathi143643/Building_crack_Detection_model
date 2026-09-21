FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY model/requirements.txt ./model/requirements.txt
RUN pip install --no-cache-dir -r model/requirements.txt

COPY model ./model

CMD ["sh", "-c", "uvicorn model.index:app --host 0.0.0.0 --port ${PORT:-8000}"]