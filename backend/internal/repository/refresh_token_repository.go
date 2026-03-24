package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type RefreshTokenRepository struct {
	redis *redis.Client
}

func NewRefreshTokenRepository(redis *redis.Client) *RefreshTokenRepository {
	return &RefreshTokenRepository{redis: redis}
}

func (r *RefreshTokenRepository) Save(ctx context.Context, jti string, userID uint, ttl time.Duration) error {
	key := fmt.Sprintf("refresh:%s", jti)
	return r.redis.Set(ctx, key, userID, ttl).Err()
}

func (r *RefreshTokenRepository) Exists(ctx context.Context, jti string) (bool, error) {
	key := fmt.Sprintf("refresh:%s", jti)
	n, err := r.redis.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (r *RefreshTokenRepository) Delete(ctx context.Context, jti string) error {
	key := fmt.Sprintf("refresh:%s", jti)
	return r.redis.Del(ctx, key).Err()
}
