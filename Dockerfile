FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY orchestrator/ ./orchestrator/
COPY memory/ ./memory/
COPY templates/ ./templates/

RUN mkdir -p audit

RUN useradd -m factory && chown -R factory:factory /app
USER factory

CMD ["uvicorn", "orchestrator:app", "--host", "0.0.0.0", "--port", "8000"]
