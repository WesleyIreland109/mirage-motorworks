.PHONY: dev backend frontend mobile install test build fmt vpic-update
dev:
	@trap 'kill 0' INT TERM EXIT; DEV_MODE=true go run ./apps/telemetry-service & npm --prefix apps/dashboard run dev
backend:
	DEV_MODE=true go run ./apps/telemetry-service
frontend:
	npm --prefix apps/dashboard run dev
mobile:
	npm --prefix apps/mobile start
install:
	npm --prefix apps/dashboard install
	npm --prefix apps/mobile install
test:
	go test ./...
	npm --prefix apps/dashboard test
	npm --prefix apps/mobile run typecheck
build:
	go build -o bin/telemetry-service ./apps/telemetry-service
	go build -o bin/mirage ./apps/mirage
	npm --prefix apps/dashboard run build
	npm --prefix apps/mobile run export:web
fmt:
	gofmt -w apps internal
vpic-update:
	./scripts/update-vpic.sh
