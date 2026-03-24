package middleware

import (
	"net/http"
	"strings"

	"backend/internal/pkg/config"
	"backend/internal/pkg/utils"
	"github.com/gin-gonic/gin"
)

const ContextClaimsKey = "jwt_claims"

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			utils.Fail(c, http.StatusUnauthorized, "missing or invalid Authorization header")
			c.Abort()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := utils.ParseToken(cfg.JWTAccessSecret, token)
		if err != nil || claims.Type != utils.TokenTypeAccess {
			utils.Fail(c, http.StatusUnauthorized, "access token expired or invalid")
			c.Abort()
			return
		}

		c.Set(ContextClaimsKey, claims)
		c.Next()
	}
}

func GetClaims(c *gin.Context) (*utils.CustomClaims, bool) {
	v, ok := c.Get(ContextClaimsKey)
	if !ok {
		return nil, false
	}
	claims, ok := v.(*utils.CustomClaims)
	return claims, ok
}
