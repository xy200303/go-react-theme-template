package cache

import (
	"context"
	"fmt"
	"time"

	"backend/internal/pkg/config"
	"github.com/redis/go-redis/v9"
)

func NewRedisClient(cfg *config.Config) (*redis.Client, error) {
	cli := redis.NewClient(&redis.Options{
		Addr:         cfg.RedisAddr,
		Password:     cfg.RedisPassword,
		DB:           cfg.RedisDB,
		DialTimeout:  3 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := cli.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis connectivity check failed: %w", err)
	}
	return cli, nil
}