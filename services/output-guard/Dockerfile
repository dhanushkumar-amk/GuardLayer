FROM python:3.10-slim

WORKDIR /app

ENV PIP_DEFAULT_TIMEOUT=300
ENV PIP_RETRIES=10
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --retries ${PIP_RETRIES} -r requirements.txt

# Pre-download the SpaCy model required by Presidio to ensure it is in the image
RUN python -m spacy download en_core_web_sm

COPY . .

EXPOSE 8002

ENV PORT=8002
ENV LITELLM_MODEL=gpt-3.5-turbo

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
