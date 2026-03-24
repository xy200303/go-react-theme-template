package controllers

import (
	"net/http"

	"backend/internal/models/dto/requests"
	"backend/internal/pkg/utils"
	"backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthController struct {
	authService *service.AuthService
}

func NewAuthController(authService *service.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

func (ctl *AuthController) SendSMSCode(c *gin.Context) {
	var req requests.SendSMSCodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "请求参数不正确")
		return
	}
	if err := ctl.authService.SendSMSCode(c.Request.Context(), req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"sent": true})
}

func (ctl *AuthController) Register(c *gin.Context) {
	var req requests.RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "请求参数不正确")
		return
	}
	resp, err := ctl.authService.Register(c.Request.Context(), req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, resp)
}

func (ctl *AuthController) PasswordLogin(c *gin.Context) {
	var req requests.PasswordLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "请求参数不正确")
		return
	}
	resp, err := ctl.authService.LoginWithPassword(c.Request.Context(), req)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, err.Error())
		return
	}
	utils.Success(c, resp)
}

func (ctl *AuthController) SMSLogin(c *gin.Context) {
	var req requests.SMSLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "请求参数不正确")
		return
	}
	resp, err := ctl.authService.LoginWithSMS(c.Request.Context(), req)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, err.Error())
		return
	}
	utils.Success(c, resp)
}

func (ctl *AuthController) Refresh(c *gin.Context) {
	var req requests.RefreshTokenReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "请求参数不正确")
		return
	}
	resp, err := ctl.authService.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, err.Error())
		return
	}
	utils.Success(c, resp)
}

func (ctl *AuthController) Logout(c *gin.Context) {
	var req requests.LogoutReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "请求参数不正确")
		return
	}
	if err := ctl.authService.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}
