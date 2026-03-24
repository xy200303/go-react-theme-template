# Enterprise Website Template / 企业级网站模板

基于 `Gin + React + Casbin + JWT + PostgreSQL + Redis` 的企业级项目模板，内置认证、权限、配置管理、短信验证码与文件上传能力。

An enterprise-ready starter built with `Gin + React + Casbin + JWT + PostgreSQL + Redis`, including authentication, RBAC, config management, SMS verification, and file upload support.

## Features / 功能特性

- 用户注册与登录：密码登录 + 短信验证码登录
- Access Token + Refresh Token 登录态管理
- 个人中心：资料维护、头像上传、修改密码、手机号换绑
- 管理后台：用户、角色、策略、系统配置
- 策略模板：从控制器 OpenAPI 风格注释生成 `openapi.json`
- 文件上传：优先腾讯云 COS，未配置时自动回退本地存储
- 前端支持中英文切换：`zh-CN` / `en-US`

- User registration and login: password login + SMS login
- Access Token + Refresh Token based session flow
- Profile center: profile update, avatar upload, password reset, phone rebinding
- Admin console: users, roles, policies, and system configs
- Policy templates generated from controller OpenAPI-style annotations
- File upload with Tencent COS first and automatic local fallback
- Frontend i18n support for `zh-CN` and `en-US`

## Tech Stack / 技术栈

- Backend: Go, Gin, Gorm, Casbin, Redis, PostgreSQL
- Frontend: React, Vite, TypeScript, Bun, Ant Design, TailwindCSS
- Cloud: Tencent SMS, Tencent COS

## Project Structure / 项目结构

```text
backend/
  cmd/server              # Go entry
  generate/               # policy openapi generator + embedded openapi.json
  internal/               # controllers, services, repositories, models
  web/                    # frontend build output

frontend/
  src/
    api/
    components/
    i18n/
    pages/
```

## Quick Start / 快速开始

### 1. Start dependencies / 启动依赖

```bash
docker compose up -d
```

### 2. Configure backend env / 配置后端环境变量

复制并编辑 `backend/.env`：

Copy and edit `backend/.env`:

```env
POSTGRES_DSN=postgres://postgres:postgres@127.0.0.1:5432/enterprise_web?sslmode=disable&TimeZone=Asia%2FShanghai
REDIS_ADDR=127.0.0.1:6379
JWT_ACCESS_SECRET=replace-with-access-secret
JWT_REFRESH_SECRET=replace-with-refresh-secret
```

也兼容 `POSTGRES_URL`。

`POSTGRES_URL` is also supported.

### 3. Run backend / 启动后端

```bash
cd backend
go run ./cmd/server
```

### 4. Run frontend / 启动前端

```bash
cd frontend
bun install
bun run dev
```

### 5. Build frontend / 构建前端

```bash
cd frontend
bun run build
```

前端构建输出到 `backend/web`，Go 服务已内置静态资源挂载与 SPA 回退。

The frontend build is emitted to `backend/web`, and the Go server already serves it with SPA fallback.

## Environment Variables / 环境变量

参考文件：[`backend/.env.example`](./backend/.env.example)

Reference file: [`backend/.env.example`](./backend/.env.example)

### Core / 核心配置

- `SERVER_PORT`: 后端端口 / backend port
- `SERVER_MODE`: 运行模式，常见为 `debug` 或 `release` / runtime mode, usually `debug` or `release`
- `FRONTEND_DIST_DIR`: 前端构建目录 / frontend build directory
- `POSTGRES_DSN`: PostgreSQL 连接串 / PostgreSQL DSN
- `REDIS_ADDR`: Redis 地址 / Redis address
- `JWT_ACCESS_SECRET`: Access Token 密钥 / access token secret
- `JWT_REFRESH_SECRET`: Refresh Token 密钥 / refresh token secret

### SMS / 短信配置

- `SMS_VERIFY_ENABLED`: 是否启用短信验证码校验 / enable SMS verification
- `TENCENT_SMS_SECRET_ID`: 腾讯云 API SecretId
- `TENCENT_SMS_SECRET_KEY`: 腾讯云 API SecretKey
- `TENCENT_SMS_SDK_APP_ID`: 腾讯云短信应用 `SdkAppId`
- `TENCENT_SMS_SIGN_NAME`: 已审核通过的短信签名内容，不是签名编号
- `TENCENT_SMS_TEMPLATE_ID`: 已审核通过的短信模板 ID，不是签名编号
- `TENCENT_SMS_REGION`: 腾讯云地域，默认 `ap-guangzhou`

短信模板需要和代码里传入的参数个数一致。当前代码默认发送一个模板参数，即验证码本身。

The approved SMS template must match the number of parameters passed by the backend. The current code sends one template parameter: the verification code itself.

### Upload / 上传配置

- `UPLOAD_DRIVER`: `auto` / `local` / `cos`
- `UPLOAD_LOCAL_PATH`: 本地上传目录 / local upload directory
- `UPLOAD_MAX_SIZE_MB`: 上传大小限制 / upload size limit
- `TENCENT_COS_SECRET_ID`, `TENCENT_COS_SECRET_KEY`, `TENCENT_COS_BUCKET_URL`, `TENCENT_COS_BASE_URL`: 腾讯云 COS 配置 / Tencent COS settings

### Init Admin / 初始管理员

- `INIT_ADMIN_USERNAME`
- `INIT_ADMIN_PHONE`
- `INIT_ADMIN_PASSWORD`

## Policy Template Generation / 策略模板生成

项目中的后台策略模板不是手写维护，而是从控制器方法注释生成。

Admin policy templates are generated from controller method annotations instead of being maintained manually.

示例：

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

生成命令：

Generate command:

```bash
cd backend
go generate ./generate
```

生成结果会写入：

The generated result is written to:

```text
backend/generate/openapi.json
```

运行时由 `backend/generate/registry.go` 读取并转换后，通过管理后台接口返回给前端。

At runtime, `backend/generate/registry.go` reads and transforms the file, then exposes it to the admin frontend API.

## API Overview / 接口概览

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

## Build and Test / 构建与测试

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
