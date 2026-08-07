.PHONY: dev backend frontend install test build fmt
dev:
	@trap 'kill 0' INT TERM EXIT; DEV_MODE=true go run ./apps/telemetry-service & npm --prefix apps/dashboard run dev
backend:
	DEV_MODE=true go run ./apps/telemetry-service
frontend:
	npm --prefix apps/dashboard run dev
install:
	npm --prefix apps/dashboard install
test:
	go test ./...
	npm --prefix apps/dashboard test
build:
	go build -o bin/telemetry-service ./apps/telemetry-service
	go build -o bin/mirage ./apps/mirage
	npm --prefix apps/dashboard run build
fmt:
	gofmt -w apps/telemetry-service internal
