package response

import "time"

type UserResp struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	AvatarURL string    `json:"avatar_url"`
	Signature string    `json:"signature"`
	Gender    string    `json:"gender"`
	Age       int       `json:"age"`
	IsActive  bool      `json:"is_active"`
	Roles     []string  `json:"roles"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SystemStatsResp struct {
	UserCount         int64 `json:"user_count"`
	RoleCount         int64 `json:"role_count"`
	SystemConfigCount int64 `json:"system_config_count"`
	RedisOnline       bool  `json:"redis_online"`
}
