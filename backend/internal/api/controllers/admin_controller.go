package controllers

import (
	"net/http"
	"strconv"

	"backend/internal/api/middleware"
	"backend/internal/models/dto/requests"
	"backend/internal/pkg/utils"
	"backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AdminController struct {
	adminService *service.AdminService
}

func NewAdminController(adminService *service.AdminService) *AdminController {
	return &AdminController{adminService: adminService}
}

// Stats godoc
// @Summary 查看系统统计
// @Description 允许查看后台首页的系统统计数据
// @Tags dashboard
// @ID dashboard.stats.get
// @Router /api/v1/admin/stats [get]
func (ctl *AdminController) Stats(c *gin.Context) {
	resp, err := ctl.adminService.Stats(c.Request.Context())
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(c, resp)
}

func (ctl *AdminController) ListPolicyTemplates(c *gin.Context) {
	utils.Success(c, ctl.adminService.ListPolicyTemplates())
}

// ListUsers godoc
// @Summary 查看用户列表
// @Description 允许查看并按条件搜索用户列表
// @Tags users
// @ID users.list
// @Router /api/v1/admin/users [get]
func (ctl *AdminController) ListUsers(c *gin.Context) {
	resp, err := ctl.adminService.ListUsers(c.Query("keyword"))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(c, resp)
}

// CreateUser godoc
// @Summary 创建用户
// @Description 允许新增后台用户并写入基础资料
// @Tags users
// @ID users.create
// @Router /api/v1/admin/users [post]
func (ctl *AdminController) CreateUser(c *gin.Context) {
	var req requests.CreateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	resp, err := ctl.adminService.CreateUser(req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, resp)
}

// UpdateUser godoc
// @Summary 编辑用户信息
// @Description 允许修改指定用户的基础资料信息
// @Tags users
// @ID users.update
// @Router /api/v1/admin/users/{id} [put]
func (ctl *AdminController) UpdateUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}
	var req requests.UpdateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	resp, err := ctl.adminService.UpdateUser(uint(id), req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, resp)
}

// DeleteUser godoc
// @Summary 删除用户
// @Description 允许删除指定用户账号
// @Tags users
// @ID users.delete
// @Router /api/v1/admin/users/{id} [delete]
func (ctl *AdminController) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}
	claims, ok := middleware.GetClaims(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := ctl.adminService.DeleteUser(uint(id), claims.UserID); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// ResetUserPassword godoc
// @Summary 重置用户密码
// @Description 允许为指定用户重置登录密码
// @Tags users
// @ID users.password
// @Router /api/v1/admin/users/{id}/password [put]
func (ctl *AdminController) ResetUserPassword(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}
	var req requests.ResetUserPasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	if err := ctl.adminService.ResetUserPassword(uint(id), req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// UpdateUserRoles godoc
// @Summary 分配用户角色
// @Description 允许调整指定用户的角色权限
// @Tags users
// @ID users.roles
// @Router /api/v1/admin/users/{id}/roles [put]
func (ctl *AdminController) UpdateUserRoles(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}
	var req requests.UpdateUserRolesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	if err := ctl.adminService.UpdateUserRoles(uint(id), req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// ListRoles godoc
// @Summary 查看角色列表
// @Description 允许查看系统中的角色列表
// @Tags roles
// @ID roles.list
// @Router /api/v1/admin/roles [get]
func (ctl *AdminController) ListRoles(c *gin.Context) {
	resp, err := ctl.adminService.ListRoles()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(c, resp)
}

// CreateRole godoc
// @Summary 创建角色
// @Description 允许创建新的角色定义
// @Tags roles
// @ID roles.create
// @Router /api/v1/admin/roles [post]
func (ctl *AdminController) CreateRole(c *gin.Context) {
	var req requests.CreateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	resp, err := ctl.adminService.CreateRole(req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, resp)
}

// UpdateRole godoc
// @Summary 编辑角色
// @Description 允许修改角色的显示名称和说明
// @Tags roles
// @ID roles.update
// @Router /api/v1/admin/roles/{id} [put]
func (ctl *AdminController) UpdateRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid role id")
		return
	}
	var req requests.UpdateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	if err := ctl.adminService.UpdateRole(uint(id), req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// DeleteRole godoc
// @Summary 删除角色
// @Description 允许删除指定角色
// @Tags roles
// @ID roles.delete
// @Router /api/v1/admin/roles/{id} [delete]
func (ctl *AdminController) DeleteRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid role id")
		return
	}
	if err := ctl.adminService.DeleteRole(uint(id)); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// GetRolePolicies godoc
// @Summary 查看角色策略
// @Description 允许查看指定角色已分配的接口策略
// @Tags roles
// @ID roles.policies.get
// @Router /api/v1/admin/roles/{id}/policies [get]
func (ctl *AdminController) GetRolePolicies(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid role id")
		return
	}
	resp, err := ctl.adminService.GetRolePolicies(uint(id))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, resp)
}

// SetRolePolicies godoc
// @Summary 保存角色策略
// @Description 允许更新指定角色的接口访问策略
// @Tags roles
// @ID roles.policies.set
// @Router /api/v1/admin/roles/{id}/policies [put]
func (ctl *AdminController) SetRolePolicies(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid role id")
		return
	}
	var req requests.SetRolePoliciesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	if err := ctl.adminService.SetRolePolicies(uint(id), req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}

// ListSystemConfigs godoc
// @Summary 查看系统配置
// @Description 允许查看系统配置项列表
// @Tags configs
// @ID configs.list
// @Router /api/v1/admin/system-configs [get]
func (ctl *AdminController) ListSystemConfigs(c *gin.Context) {
	resp, err := ctl.adminService.ListSystemConfigs()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(c, resp)
}

// UpsertSystemConfig godoc
// @Summary 保存系统配置
// @Description 允许新增或更新系统配置项
// @Tags configs
// @ID configs.save
// @Router /api/v1/admin/system-configs [put]
func (ctl *AdminController) UpsertSystemConfig(c *gin.Context) {
	var req requests.SystemConfigReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request")
		return
	}
	if err := ctl.adminService.UpsertSystemConfig(req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, gin.H{"ok": true})
}
