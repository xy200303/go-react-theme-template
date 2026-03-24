package controllers

import (
	"net/http"

	"backend/internal/api/middleware"
	"backend/internal/models/dto/requests"
	"backend/internal/pkg/utils"
	"backend/internal/service"
	"github.com/gin-gonic/gin"
)

type UserController struct {
	userService *service.UserService
}

func NewUserController(userService *service.UserService) *UserController {
	return &UserController{userService: userService}
}

// GetProfile godoc
// @Summary 查看个人资料
// @Description 允许查看当前登录用户的个人资料信息
// @Tags profile
// @ID profile.view
// @Router /api/v1/user/profile [get]
func (ctl *UserController) GetProfile(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	resp, err := ctl.userService.GetProfile(claims.UserID)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, resp)
}

// UpdateProfile godoc
// @Summary 更新个人资料
// @Description 允许修改当前登录用户的基础资料
// @Tags profile
// @ID profile.update
// @Router /api/v1/user/profile [put]
func (ctl *UserController) UpdateProfile(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req requests.UpdateProfileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	resp, err := ctl.userService.UpdateProfile(claims.UserID, req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, resp)
}

// ResetPassword godoc
// @Summary 重置个人密码
// @Description 允许重置当前登录用户的登录密码
// @Tags profile
// @ID profile.password
// @Router /api/v1/user/password/reset [post]
func (ctl *UserController) ResetPassword(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req requests.ResetPasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	if err := ctl.userService.ResetPassword(claims.UserID, req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// ChangePhone godoc
// @Summary 更换手机号
// @Description 允许验证当前手机号后绑定新的手机号
// @Tags profile
// @ID profile.phone
// @Router /api/v1/user/phone/change [post]
func (ctl *UserController) ChangePhone(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req requests.ChangePhoneReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	if err := ctl.userService.ChangePhone(c.Request.Context(), claims.UserID, req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// UploadAvatar godoc
// @Summary 上传头像
// @Description 允许上传并更新当前登录用户头像
// @Tags profile
// @ID profile.avatar
// @Router /api/v1/user/avatar/upload [post]
func (ctl *UserController) UploadAvatar(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "file is required")
		return
	}
	url, err := ctl.userService.UploadAvatar(claims.UserID, file)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"avatar_url": url})
}
