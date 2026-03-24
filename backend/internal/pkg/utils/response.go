package utils

import "github.com/gin-gonic/gin"

// APIResponse is the unified API response envelope.
type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(200, APIResponse{Code: 0, Message: "ok", Data: data})
}

func Fail(c *gin.Context, httpCode int, message string) {
	c.JSON(httpCode, APIResponse{Code: httpCode, Message: message})
}