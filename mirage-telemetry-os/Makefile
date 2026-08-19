.PHONY: dev backend frontend mobile install test build fmt vpic-update short-test record
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
short-test:
	@test -n "$(FRIEND)" || (echo 'usage: make short-test FRIEND="Friend Name"' >&2; exit 2)
	bin/mirage --label "$(FRIEND) // SHORT TEST" --max-duration 2m session record
record:
	@test -n "$(FRIEND)" || (echo 'usage: make record FRIEND="Friend Name"' >&2; exit 2)
	bin/mirage --label "$(FRIEND) // DRIVE" session record
