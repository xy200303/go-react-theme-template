# 企业级网站模板

基于 `Gin + React + Casbin + JWT + PostgreSQL + Redis` 的企业级项目模板，内置认证、权限、配置管理、短信验证码与文件上传能力。

## 功能特性

- 用户注册与登录：支持密码登录与短信验证码登录
- Token 体系：内置 Access Token + Refresh Token 会话流转
- 个人中心：支持资料维护、头像上传、密码重置、手机号换绑
- 管理后台：提供用户、角色、策略、系统配置管理
- 策略模板：从控制器 OpenAPI 风格注释生成 `openapi.json`
- 文件上传：优先腾讯云 COS，未配置时自动回退本地存储
- 前端国际化：内置 `zh-CN` / `en-US`

## 技术栈

- 后端：Go、Gin、Gorm、Casbin、Redis、PostgreSQL
- 前端：React、Vite、TypeScript、Bun、Ant Design、Tailwind CSS
- 云服务：Tencent SMS、Tencent COS

## 项目结构

```text
backend/
  cmd/server              # Go 服务入口
  configs/                # Casbin 等运行时配置
  generate/               # policy openapi 生成器与嵌入资源
  internal/               # controllers、services、repositories、models
  uploads/                # 本地上传目录
  web/                    # 前端构建产物

frontend/
  src/
    api/
    components/
    i18n/
    pages/
```

## 快速开始

### 方式一：本地开发

1. 启动依赖服务

如果只想在本地运行后端和前端开发环境，可以只启动数据库与缓存：

```bash
docker compose up -d postgres redis
```

当前仓库默认将容器端口映射到宿主机：

- PostgreSQL: `127.0.0.1:5433`
- Redis: `127.0.0.1:6380`

2. 配置后端环境变量

复制 `backend/.env.example` 为 `backend/.env`，并按本地开发环境修改：

```env
POSTGRES_DSN=postgres://postgres:postgres@127.0.0.1:5433/enterprise_web?sslmode=disable&TimeZone=Asia/Shanghai
REDIS_ADDR=127.0.0.1:6380
JWT_ACCESS_SECRET=replace-with-access-secret
JWT_REFRESH_SECRET=replace-with-refresh-secret
```

说明：

- 代码同时兼容 `POSTGRES_DSN` 与 `POSTGRES_URL`
- 如果启用短信登录，需要补齐腾讯云短信配置
- 如果使用你自己本机安装的 PostgreSQL / Redis，而不是仓库自带的 Compose 服务，可继续使用 `5432` / `6379`

3. 启动后端

```bash
cd backend
go run ./cmd/server
```

默认监听：`http://127.0.0.1:8080`

4. 启动前端开发服务器

```bash
cd frontend
bun install
bun run dev
```

默认前端开发地址：`http://127.0.0.1:5173`

Vite 已配置 `/api` 代理到 `http://127.0.0.1:8080`。

### 方式二：Docker Compose 整体部署

仓库根目录已提供多阶段构建的 `Dockerfile` 与 `docker-compose.yml`，可直接启动完整应用栈：

```bash
docker compose up -d --build
```

默认会启动：

- `app`：Go 后端 + 已构建前端静态资源，暴露 `8080`
- `postgres`：PostgreSQL 16，宿主机端口 `5433`
- `redis`：Redis 7，宿主机端口 `6380`

应用启动后可通过 `http://127.0.0.1:8080` 访问。

`app` 服务使用容器内地址连接依赖，例如：

- `POSTGRES_DSN=...@postgres:5432/...`
- `REDIS_ADDR=redis:6379`

如果需要自定义生产环境变量，可参考 `docker-compose-example.yml`。

## 前端构建

```bash
cd frontend
bun run build
```

构建产物默认输出到 `backend/web`，Go 服务已内置静态资源挂载与 SPA 回退逻辑。

## 环境变量

参考文件：`backend/.env.example`

### 核心配置

- `SERVER_PORT`：后端端口
- `SERVER_MODE`：运行模式，常见为 `debug` 或 `release`
- `FRONTEND_DIST_DIR`：前端构建目录
- `POSTGRES_DSN`：PostgreSQL 连接串
- `REDIS_ADDR`：Redis 地址
- `JWT_ACCESS_SECRET`：Access Token 密钥
- `JWT_REFRESH_SECRET`：Refresh Token 密钥

### 短信配置

- `SMS_VERIFY_ENABLED`：是否启用短信验证码校验
- `TENCENT_SMS_SECRET_ID`
- `TENCENT_SMS_SECRET_KEY`
- `TENCENT_SMS_SDK_APP_ID`
- `TENCENT_SMS_SIGN_NAME`
- `TENCENT_SMS_TEMPLATE_ID`
- `TENCENT_SMS_REGION`：默认 `ap-guangzhou`

当前代码默认向短信模板传入 1 个模板参数，即验证码本身，因此腾讯云审核通过的模板内容需要与此保持一致。

### 上传配置

- `UPLOAD_DRIVER`：`auto` / `local` / `cos`
- `UPLOAD_LOCAL_PATH`：本地上传目录
- `UPLOAD_MAX_SIZE_MB`：上传大小限制
- `UPLOAD_ALLOWED_SUFFIX`：允许上传的扩展名列表
- `TENCENT_COS_SECRET_ID`
- `TENCENT_COS_SECRET_KEY`
- `TENCENT_COS_BUCKET_URL`
- `TENCENT_COS_BASE_URL`

### 初始管理员

- `INIT_ADMIN_USERNAME`
- `INIT_ADMIN_PHONE`
- `INIT_ADMIN_PASSWORD`

## 策略模板生成

管理后台策略模板不是手写维护，而是从控制器方法注释生成。

示例：

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

```bash
cd backend
go generate ./generate
```

生成结果写入：

```text
backend/generate/openapi.json
```

运行时由 `backend/generate/registry.go` 读取并转换后，通过管理后台接口返回给前端。

## API 概览

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

## 常用命令

```bash
# 安装前端依赖
make deps

# 启动后端
make backend

# 启动前端开发服务器
make frontend

# 构建前后端
make build

# 清理前端构建产物
make clean
```

## 测试与构建

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
