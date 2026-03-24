.PHONY: deps backend frontend build clean

deps:
	cd frontend && bun install

backend:
	cd backend && go run ./cmd/server

frontend:
	cd frontend && bun run dev

build:
	cd frontend && bun run build
	cd backend && go build -o server.exe ./cmd/server

clean:
	if exist backend\\web rmdir /s /q backend\\web
