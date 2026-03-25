# syntax=docker/dockerfile:1.7

# 单独安装前端依赖，便于复用缓存，减少后续构建时间。
FROM oven/bun:1 AS frontend-deps
WORKDIR /src/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

# 将 Vite 前端构建到 backend/web，供 Go 服务直接托管静态资源。
FROM oven/bun:1 AS frontend-builder
WORKDIR /src
COPY --from=frontend-deps /src/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend
RUN mkdir -p /src/backend/web
WORKDIR /src/frontend
RUN bun run build

# 编译 Go 后端，并把前端构建产物一并放入后端运行目录。
FROM golang:1.24-alpine AS backend-builder
WORKDIR /src/backend
RUN apk add --no-cache ca-certificates tzdata
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
COPY --from=frontend-builder /src/backend/web ./web
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# 最终运行镜像仅保留服务二进制、静态资源和运行时配置，尽量减小镜像体积。
FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S app \
    && adduser -S -G app app \
    && mkdir -p /app/uploads /app/web \
    && chown -R app:app /app
COPY --from=backend-builder /out/server ./server
COPY --from=backend-builder /src/backend/web ./web
COPY --from=backend-builder /src/backend/configs ./configs
USER app
ENV SERVER_PORT=8080 \
    SERVER_MODE=release \
    FRONTEND_DIST_DIR=web \
    UPLOAD_LOCAL_PATH=uploads
EXPOSE 8080
CMD ["./server"]
