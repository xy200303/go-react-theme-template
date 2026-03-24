package middleware

import (
	"net/http"

	"backend/internal/pkg/utils"
	"backend/internal/service"
	"github.com/gin-gonic/gin"
)

func RBACMiddleware(casbinSvc *service.CasbinService) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			utils.Fail(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}

		okPolicy, err := casbinSvc.Enforce(claims.Roles, c.FullPath(), c.Request.Method)
		if err != nil {
			utils.Fail(c, http.StatusInternalServerError, "rbac check failed")
			c.Abort()
			return
		}
		if !okPolicy {
			utils.Fail(c, http.StatusForbidden, "permission denied")
			c.Abort()
			return
		}

		c.Next()
	}
}

func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			utils.Fail(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}
		for _, role := range claims.Roles {
			if role == "admin" {
				c.Next()
				return
			}
		}
		utils.Fail(c, http.StatusForbidden, "admin role required")
		c.Abort()
	}
}
