.PHONY: start stop dev docker-up docker-down

# Local development — OpenClaw runs in Docker (sandboxed), factory server runs locally
start:
	@echo "Starting OpenClaw gateway (Docker)..."
	@docker compose up -d openclaw
	@echo "OpenClaw dashboard: http://localhost:18789"
	@echo "Starting factory server on :8000..."
	uvicorn orchestrator:app --host 0.0.0.0 --port 8000

# Local development with auto-reload
dev:
	@echo "Starting OpenClaw gateway (Docker)..."
	@docker compose up -d openclaw
	@echo "OpenClaw dashboard: http://localhost:18789"
	@echo "Starting factory server on :8000 (reload mode)..."
	uvicorn orchestrator:app --host 0.0.0.0 --port 8000 --reload

# Stop all services
stop:
	@echo "Stopping factory server..."
	@lsof -ti:8000 | xargs kill 2>/dev/null || true
	@echo "Stopping OpenClaw container..."
	@docker compose stop openclaw
	@echo "All services stopped."

# Docker — starts everything in containers
docker-up:
	docker compose up --build

docker-down:
	docker compose down
