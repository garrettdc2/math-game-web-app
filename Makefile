.PHONY: start stop dev docker-up docker-down

# Local development — OpenClaw runs in Docker, factory server + Vite dev server run locally
dev:
	@echo "Starting OpenClaw gateway (Docker)..."
	@docker compose up -d openclaw
	@echo "OpenClaw dashboard: http://localhost:18789"
	@echo "Starting factory dev server (Hono + Vite HMR)..."
	cd openclaw-factory && npm run dev

# Production start (after build)
start:
	@echo "Starting OpenClaw gateway (Docker)..."
	@docker compose up -d openclaw
	@echo "OpenClaw dashboard: http://localhost:18789"
	@echo "Starting factory server on :8000..."
	cd openclaw-factory && npm run start

# Build for production
build:
	cd openclaw-factory && npm run build

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
