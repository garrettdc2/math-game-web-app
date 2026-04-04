.PHONY: dev build start docker-up docker-down logs clean

# Development: Hono server + Vite dev server with HMR
dev:
	npm run dev

# Production build: Vite client + tsc server
build:
	npm run build

# Start production server
start:
	npm run start

# Start all services (OpenClaw + Dashboard)
docker-up:
	docker compose up -d --build

# Stop all services
docker-down:
	docker compose down

# View logs
logs:
	docker compose logs -f

# Clean volumes and restart fresh
clean:
	docker compose down -v
	@echo "Volumes removed. Run 'make docker-up' to start fresh."
