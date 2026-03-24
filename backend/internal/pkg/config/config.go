package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config contains all runtime options loaded from .env.
type Config struct {
	ServerPort          string
	ServerMode          string
	FrontendDistDir     string
	SMSVerifyEnabled    bool
	UploadDriver        string
	UploadLocalPath     string
	UploadMaxSizeMB     int64
	AllowedUploadSuffix []string

	PostgresDSN string

	RedisAddr     string
	RedisPassword string
	RedisDB       int

	JWTAccessSecret     string
	JWTRefreshSecret    string
	JWTAccessExpireMin  int
	JWTRefreshExpireDay int

	TencentSMSSecretID  string
	TencentSMSSecretKey string
	TencentSMSSDKAppID  string
	TencentSMSSignName  string
	TencentSMSTemplate  string
	TencentSMSRegion    string

	COSSecretID  string
	COSSecretKey string
	COSBucketURL string
	COSBaseURL   string

	InitAdminUsername string
	InitAdminPhone    string
	InitAdminPassword string
}

func LoadConfig(envPath string) (*Config, error) {
	if err := godotenv.Load(envPath); err != nil {
		return nil, fmt.Errorf("failed to parse env file %s: %w", envPath, err)
	}

	cfg := &Config{
		ServerPort:          getEnv("SERVER_PORT", "8080"),
		ServerMode:          getEnv("SERVER_MODE", "debug"),
		FrontendDistDir:     getEnv("FRONTEND_DIST_DIR", "web"),
		SMSVerifyEnabled:    getEnvBool("SMS_VERIFY_ENABLED", true),
		UploadDriver:        strings.ToLower(getEnv("UPLOAD_DRIVER", "local")),
		UploadLocalPath:     getEnv("UPLOAD_LOCAL_PATH", "uploads"),
		UploadMaxSizeMB:     getEnvInt64("UPLOAD_MAX_SIZE_MB", 10),
		AllowedUploadSuffix: splitCSV(getEnv("UPLOAD_ALLOWED_SUFFIX", "jpg,jpeg,png,gif,webp")),

		PostgresDSN: getEnv("POSTGRES_DSN", getEnv("POSTGRES_URL", "")),

		RedisAddr:     getEnv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		JWTAccessSecret:     getEnv("JWT_ACCESS_SECRET", "change-me-access"),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", "change-me-refresh"),
		JWTAccessExpireMin:  getEnvInt("JWT_ACCESS_EXPIRE_MIN", 30),
		JWTRefreshExpireDay: getEnvInt("JWT_REFRESH_EXPIRE_DAY", 7),

		TencentSMSSecretID:  getEnv("TENCENT_SMS_SECRET_ID", ""),
		TencentSMSSecretKey: getEnv("TENCENT_SMS_SECRET_KEY", ""),
		TencentSMSSDKAppID:  getEnv("TENCENT_SMS_SDK_APP_ID", ""),
		TencentSMSSignName:  getEnv("TENCENT_SMS_SIGN_NAME", ""),
		TencentSMSTemplate:  getEnv("TENCENT_SMS_TEMPLATE_ID", ""),
		TencentSMSRegion:    getEnv("TENCENT_SMS_REGION", "ap-guangzhou"),

		COSSecretID:  getEnv("TENCENT_COS_SECRET_ID", ""),
		COSSecretKey: getEnv("TENCENT_COS_SECRET_KEY", ""),
		COSBucketURL: getEnv("TENCENT_COS_BUCKET_URL", ""),
		COSBaseURL:   getEnv("TENCENT_COS_BASE_URL", ""),

		InitAdminUsername: getEnv("INIT_ADMIN_USERNAME", "admin"),
		InitAdminPhone:    getEnv("INIT_ADMIN_PHONE", "13800000000"),
		InitAdminPassword: getEnv("INIT_ADMIN_PASSWORD", "Admin@123456"),
	}

	if cfg.PostgresDSN == "" {
		return nil, fmt.Errorf("POSTGRES_DSN or POSTGRES_URL cannot be empty")
	}

	if cfg.JWTAccessSecret == "" || cfg.JWTRefreshSecret == "" {
		return nil, fmt.Errorf("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required")
	}

	if cfg.JWTAccessExpireMin <= 0 {
		cfg.JWTAccessExpireMin = 30
	}
	if cfg.JWTRefreshExpireDay <= 0 {
		cfg.JWTRefreshExpireDay = 7
	}

	if cfg.UploadMaxSizeMB <= 0 {
		cfg.UploadMaxSizeMB = 10
	}

	if cfg.UploadLocalPath == "" {
		cfg.UploadLocalPath = "uploads"
	}

	if cfg.ServerMode == "" {
		cfg.ServerMode = "debug"
	}

	return cfg, nil
}

func (c *Config) AccessExpireDuration() time.Duration {
	return time.Duration(c.JWTAccessExpireMin) * time.Minute
}

func (c *Config) RefreshExpireDuration() time.Duration {
	return time.Duration(c.JWTRefreshExpireDay) * 24 * time.Hour
}

func getEnv(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func getEnvInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvInt64(key string, fallback int64) int64 {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvBool(key string, fallback bool) bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if v == "" {
		return fallback
	}
	switch v {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func splitCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(strings.ToLower(p))
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}
