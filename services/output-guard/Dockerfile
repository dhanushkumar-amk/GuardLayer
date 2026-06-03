FROM python:3.10-slim

WORKDIR /app

# Install build dependencies for compiling C-extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the SpaCy model required by Presidio to ensure it is in the image
RUN python -m spacy download en_core_web_sm

COPY . .

EXPOSE 8002

ENV PORT=8002
ENV LITELLM_MODEL=gpt-3.5-turbo

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
