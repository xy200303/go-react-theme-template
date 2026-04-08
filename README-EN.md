# Enterprise Website Template

<img width="2490" height="1477" alt="image" src="https://github.com/user-attachments/assets/d9ce0569-e061-4a8c-a632-cd8f56e2ff5c" />

<img width="2500" height="1465" alt="image" src="https://github.com/user-attachments/assets/e75466f4-2a60-4c78-82bd-b7f3f69d429a" />

<img width="2494" height="1451" alt="image" src="https://github.com/user-attachments/assets/b7c7f4b8-eaf0-4618-aaee-9e218864d398" />

<img width="2467" height="1472" alt="image" src="https://github.com/user-attachments/assets/1b2e618e-9309-4601-b4f8-e756483ad06e" />



An enterprise-ready starter built with `Gin + React + Casbin + JWT + PostgreSQL + Redis`, including authentication, RBAC, configuration management, SMS verification, and file upload support.

## Features

- User authentication: password login and SMS-code login
- Token flow: built-in Access Token + Refresh Token session handling
- Profile center: profile updates, avatar upload, password reset, and phone rebinding
- Admin console: users, roles, policies, and system configuration management
- Policy templates: generate `openapi.json` from controller OpenAPI-style annotations
- File uploads: prefer Tencent COS and fall back to local storage automatically
- Frontend i18n: built-in `zh-CN` / `en-US`

## Tech Stack

- Backend: Go, Gin, Gorm, Casbin, Redis, PostgreSQL
- Frontend: React, Vite, TypeScript, Bun, Ant Design, Tailwind CSS
- Cloud services: Tencent SMS, Tencent COS

## Project Structure

```text
backend/
  cmd/server              # Go service entry point
  configs/                # Runtime configs such as Casbin model files
  generate/               # policy openapi generator and embedded assets
  internal/               # controllers, services, repositories, models
  uploads/                # local upload directory
  web/                    # frontend build output

frontend/
  src/
    api/
    components/
    i18n/
    pages/
```

## Quick Start

### Option 1: Local Development

1. Start dependencies

If you only want to run the backend and frontend locally, start just PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

The repository currently maps container ports to these host ports:

- PostgreSQL: `127.0.0.1:5433`
- Redis: `127.0.0.1:6380`

2. Configure backend environment variables

Copy `backend/.env.example` to `backend/.env`, then adjust it for your local setup:

```env
POSTGRES_DSN=postgres://postgres:postgres@127.0.0.1:5433/enterprise_web?sslmode=disable&TimeZone=Asia/Shanghai
REDIS_ADDR=127.0.0.1:6380
JWT_ACCESS_SECRET=replace-with-access-secret
JWT_REFRESH_SECRET=replace-with-refresh-secret
```

Notes:

- The backend accepts both `POSTGRES_DSN` and `POSTGRES_URL`
- If you enable SMS login, you also need valid Tencent SMS credentials
- If you use your own locally installed PostgreSQL / Redis instead of the bundled Compose services, `5432` / `6379` are still valid defaults

3. Run the backend

```bash
cd backend
go run ./cmd/server
```

Default backend address: `http://127.0.0.1:8080`

4. Run the frontend dev server

```bash
cd frontend
bun install
bun run dev
```

Default frontend dev address: `http://127.0.0.1:5173`

Vite is already configured to proxy `/api` requests to `http://127.0.0.1:8080`.

### Option 2: Full Docker Compose Deployment

The repository includes a multi-stage `Dockerfile` and a ready-to-run `docker-compose.yml`, so you can start the full application stack directly:

```bash
docker compose up -d --build
```

By default this starts:

- `app`: Go backend with built frontend static assets, exposed on `8080`
- `postgres`: PostgreSQL 16, mapped to host port `5433`
- `redis`: Redis 7, mapped to host port `6380`

After startup, access the app at `http://127.0.0.1:8080`.

The `app` service connects to its dependencies through container-internal addresses, for example:

- `POSTGRES_DSN=...@postgres:5432/...`
- `REDIS_ADDR=redis:6379`

If you want a customizable deployment template, use `docker-compose-example.yml` as a reference.

## Frontend Build

```bash
cd frontend
bun run build
```

The build output is written to `backend/web` by default. The Go server already serves the static files and handles SPA fallback routing.

## Environment Variables

Reference file: `backend/.env.example`

### Core Settings

- `SERVER_PORT`: backend port
- `SERVER_MODE`: runtime mode, usually `debug` or `release`
- `FRONTEND_DIST_DIR`: frontend build directory
- `POSTGRES_DSN`: PostgreSQL connection string
- `REDIS_ADDR`: Redis address
- `JWT_ACCESS_SECRET`: access token secret
- `JWT_REFRESH_SECRET`: refresh token secret

### SMS Settings

- `SMS_VERIFY_ENABLED`: enable or disable SMS-code verification
- `TENCENT_SMS_SECRET_ID`
- `TENCENT_SMS_SECRET_KEY`
- `TENCENT_SMS_SDK_APP_ID`
- `TENCENT_SMS_SIGN_NAME`
- `TENCENT_SMS_TEMPLATE_ID`
- `TENCENT_SMS_REGION`: defaults to `ap-guangzhou`

The backend currently sends one SMS template parameter: the verification code itself. Your approved Tencent SMS template should match that parameter count.

### Upload Settings

- `UPLOAD_DRIVER`: `auto` / `local` / `cos`
- `UPLOAD_LOCAL_PATH`: local upload directory
- `UPLOAD_MAX_SIZE_MB`: upload size limit
- `UPLOAD_ALLOWED_SUFFIX`: allowed upload extensions
- `TENCENT_COS_SECRET_ID`
- `TENCENT_COS_SECRET_KEY`
- `TENCENT_COS_BUCKET_URL`
- `TENCENT_COS_BASE_URL`

### Initial Admin

- `INIT_ADMIN_USERNAME`
- `INIT_ADMIN_PHONE`
- `INIT_ADMIN_PASSWORD`

## Policy Template Generation

Admin policy templates are not maintained manually. They are generated from controller method annotations.

Example:

```go
// ListUsers godoc
// @Summary 查看用户列表
// @Description 允许查看并按条件搜索用户列表
// @Tags users
// @ID users.list
// @Router /api/v1/admin/users [get]
func (ctl *AdminController) ListUsers(c *gin.Context) {}
```

Generate them with:

```bash
cd backend
go generate ./generate
```

The output is written to:

```text
backend/generate/openapi.json
```

At runtime, `backend/generate/registry.go` reads and transforms the file, then exposes it through the admin API for the frontend.

## API Overview

### Auth

- `POST /api/v1/auth/sms/send`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login/password`
- `POST /api/v1/auth/login/sms`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### User

- `GET /api/v1/user/profile`
- `PUT /api/v1/user/profile`
- `POST /api/v1/user/password/reset`
- `POST /api/v1/user/phone/change`
- `POST /api/v1/user/avatar/upload`

### Admin

- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/policy-templates`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PUT /api/v1/admin/users/:id`
- `DELETE /api/v1/admin/users/:id`
- `PUT /api/v1/admin/users/:id/password`
- `PUT /api/v1/admin/users/:id/roles`
- `GET /api/v1/admin/roles`
- `POST /api/v1/admin/roles`
- `PUT /api/v1/admin/roles/:id`
- `DELETE /api/v1/admin/roles/:id`
- `GET /api/v1/admin/roles/:id/policies`
- `PUT /api/v1/admin/roles/:id/policies`
- `GET /api/v1/admin/system-configs`
- `PUT /api/v1/admin/system-configs`

## Common Commands

```bash
# install frontend dependencies
make deps

# run backend
make backend

# run frontend dev server
make frontend

# build frontend and backend
make build

# clean frontend build artifacts
make clean
```

## Test and Build

```bash
# backend test
cd backend
go test ./...

# policy template generate
cd backend
go generate ./generate

# frontend type check
cd frontend
bun run typecheck

# frontend build
cd frontend
bun run build
```
