.PHONY: dev build docker-build docker-up docker-down docker-logs clean setup

# Setup
setup:
	mkdir -p data

# Local development
dev:
	npm run dev

dev-watch:
	npm run dev:watch

# Build and run locally
build:
	npm run build

start-local: build
	npm run start

# Docker commands
docker-build:
	docker compose build

docker-up: setup
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# Clean up
clean:
	docker compose down -v
	rm -rf node_modules
	rm -rf dist
	rm -rf data

# Helper commands
install:
	npm ci

test:
	npm test

# Combined commands
start: setup docker-build docker-up

stop: docker-down

restart: docker-down start 