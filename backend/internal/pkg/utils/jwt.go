package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

// CustomClaims defines shared JWT claims for both access and refresh tokens.
type CustomClaims struct {
	UserID   uint      `json:"uid"`
	Username string    `json:"username"`
	Roles    []string  `json:"roles"`
	Type     TokenType `json:"type"`
	JTI      string    `json:"jti"`
	jwt.RegisteredClaims
}

func GenerateToken(secret string, expire time.Duration, claims CustomClaims) (string, error) {
	now := time.Now()
	claims.RegisteredClaims = jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(now.Add(expire)),
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		Subject:   claims.Username,
		ID:        claims.JTI,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(secret, tokenStr string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}