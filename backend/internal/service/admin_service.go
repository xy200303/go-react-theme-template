package service

import (
	"context"
	"fmt"
	"strings"

	policytemplate "backend/generate"
	"backend/internal/models/dto/requests"
	"backend/internal/models/dto/response"
	"backend/internal/models/entities"
	"backend/internal/models/mapper"
	"backend/internal/pkg/utils"
	"backend/internal/repository"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type AdminService struct {
	userRepo    *repository.UserRepository
	roleRepo    *repository.RoleRepository
	cfgRepo     *repository.SystemConfigRepository
	casbin      *CasbinService
	redisClient *redis.Client
}

const reservedAdminUsername = "admin"
const reservedAdminRoleName = "admin"
const defaultUserRoleName = "user"

func NewAdminService(
	userRepo *repository.UserRepository,
	roleRepo *repository.RoleRepository,
	cfgRepo *repository.SystemConfigRepository,
	casbin *CasbinService,
	redisClient *redis.Client,
) *AdminService {
	return &AdminService{
		userRepo:    userRepo,
		roleRepo:    roleRepo,
		cfgRepo:     cfgRepo,
		casbin:      casbin,
		redisClient: redisClient,
	}
}

func (s *AdminService) Stats(ctx context.Context) (*response.SystemStatsResp, error) {
	userCount, err := s.userRepo.Count()
	if err != nil {
		return nil, err
	}
	roleCount, err := s.roleRepo.Count()
	if err != nil {
		return nil, err
	}
	configCount, err := s.cfgRepo.Count()
	if err != nil {
		return nil, err
	}
	redisOnline := s.redisClient.Ping(ctx).Err() == nil

	return &response.SystemStatsResp{
		UserCount:         userCount,
		RoleCount:         roleCount,
		SystemConfigCount: configCount,
		RedisOnline:       redisOnline,
	}, nil
}

func (s *AdminService) ListPolicyTemplates() []response.PolicyTemplateResp {
	return policytemplate.List()
}

func (s *AdminService) ListUsers(keyword string) ([]response.UserResp, error) {
	users, err := s.userRepo.ListUsers(keyword)
	if err != nil {
		return nil, err
	}
	resp := make([]response.UserResp, 0, len(users))
	for _, u := range users {
		resp = append(resp, mapper.ToUserResp(u))
	}
	return resp, nil
}

func (s *AdminService) CreateUser(req requests.CreateUserReq) (*response.UserResp, error) {
	if err := utils.ValidateUsername(req.Username); err != nil {
		return nil, err
	}
	if err := utils.ValidatePhone(req.Phone); err != nil {
		return nil, err
	}
	if err := utils.ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	username := strings.TrimSpace(req.Username)
	phone := strings.TrimSpace(req.Phone)
	email := strings.TrimSpace(req.Email)

	if _, err := s.userRepo.FindByUsername(username); err == nil {
		return nil, fmt.Errorf("username already exists")
	} else if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if _, err := s.userRepo.FindByPhone(phone); err == nil {
		return nil, fmt.Errorf("phone already exists")
	} else if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	if email != "" {
		if _, err := s.userRepo.FindByEmail(email); err == nil {
			return nil, fmt.Errorf("email already exists")
		} else if err != gorm.ErrRecordNotFound {
			return nil, err
		}
	}

	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &entities.User{
		Username:     username,
		Phone:        phone,
		PasswordHash: passwordHash,
		Email:        email,
		AvatarURL:    strings.TrimSpace(req.AvatarURL),
		Signature:    strings.TrimSpace(req.Signature),
		Gender:       strings.TrimSpace(req.Gender),
		Age:          req.Age,
		IsActive:     req.IsActive,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	roleNames := req.RoleNames
	if len(roleNames) == 0 {
		roleNames = []string{defaultUserRoleName}
	}

	if err := s.syncUserRoles(user.ID, roleNames); err != nil {
		return nil, err
	}

	freshUser, err := s.userRepo.FindByID(user.ID)
	if err != nil {
		return nil, err
	}
	resp := mapper.ToUserResp(*freshUser)
	return &resp, nil
}

func (s *AdminService) UpdateUser(userID uint, req requests.UpdateUserReq) (*response.UserResp, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	if err := utils.ValidateUsername(req.Username); err != nil {
		return nil, err
	}
	if err := utils.ValidatePhone(req.Phone); err != nil {
		return nil, err
	}

	username := strings.TrimSpace(req.Username)
	phone := strings.TrimSpace(req.Phone)
	email := strings.TrimSpace(req.Email)

	if strings.EqualFold(user.Username, reservedAdminUsername) && !strings.EqualFold(username, reservedAdminUsername) {
		return nil, fmt.Errorf("reserved username admin cannot be changed")
	}

	existingByUsername, err := s.userRepo.FindByUsername(username)
	if err == nil && existingByUsername.ID != userID {
		return nil, fmt.Errorf("username already exists")
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	existingByPhone, err := s.userRepo.FindByPhone(phone)
	if err == nil && existingByPhone.ID != userID {
		return nil, fmt.Errorf("phone already exists")
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}
	if email != "" {
		existingByEmail, err := s.userRepo.FindByEmail(email)
		if err == nil && existingByEmail.ID != userID {
			return nil, fmt.Errorf("email already exists")
		} else if err != nil && err != gorm.ErrRecordNotFound {
			return nil, err
		}
	}

	user.Username = username
	user.Phone = phone
	user.Email = email
	user.AvatarURL = strings.TrimSpace(req.AvatarURL)
	user.Signature = strings.TrimSpace(req.Signature)
	user.Gender = strings.TrimSpace(req.Gender)
	user.Age = req.Age
	user.IsActive = req.IsActive

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	freshUser, err := s.userRepo.FindByID(user.ID)
	if err != nil {
		return nil, err
	}
	resp := mapper.ToUserResp(*freshUser)
	return &resp, nil
}

func (s *AdminService) ResetUserPassword(userID uint, req requests.ResetUserPasswordReq) error {
	if _, err := s.userRepo.FindByID(userID); err != nil {
		return err
	}
	if err := utils.ValidatePassword(req.Password); err != nil {
		return err
	}
	passwordHash, err := utils.HashPassword(strings.TrimSpace(req.Password))
	if err != nil {
		return err
	}
	return s.userRepo.UpdatePassword(userID, passwordHash)
}

func (s *AdminService) DeleteUser(userID uint, actorUserID uint) error {
	if userID == actorUserID {
		return fmt.Errorf("cannot delete current user")
	}

	if _, err := s.userRepo.FindByID(userID); err != nil {
		return err
	}
	return s.userRepo.Delete(userID)
}

func (s *AdminService) UpdateUserRoles(userID uint, req requests.UpdateUserRolesReq) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}
	if strings.EqualFold(user.Username, reservedAdminUsername) {
		return fmt.Errorf("reserved admin user roles cannot be changed")
	}
	if err := s.syncUserRoles(userID, req.RoleNames); err != nil {
		return err
	}
	return nil
}

func (s *AdminService) syncUserRoles(userID uint, roleNames []string) error {
	if len(roleNames) == 0 {
		return s.userRepo.SetRoles(userID, []entities.Role{})
	}

	roles, err := s.roleRepo.FindByNames(roleNames)
	if err != nil {
		return err
	}
	if len(roles) != len(roleNames) {
		return fmt.Errorf("some roles are undefined")
	}
	return s.userRepo.SetRoles(userID, roles)
}

func (s *AdminService) ListRoles() ([]entities.Role, error) {
	return s.roleRepo.List()
}

func (s *AdminService) CreateRole(req requests.CreateRoleReq) (*entities.Role, error) {
	role := &entities.Role{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
	}
	if err := s.roleRepo.Create(role); err != nil {
		return nil, err
	}
	return role, nil
}

func (s *AdminService) UpdateRole(roleID uint, req requests.UpdateRoleReq) error {
	role, err := s.roleRepo.GetByID(roleID)
	if err != nil {
		return err
	}
	if strings.EqualFold(role.Name, reservedAdminRoleName) {
		return fmt.Errorf("reserved admin role cannot be modified")
	}
	role.DisplayName = req.DisplayName
	role.Description = req.Description
	return s.roleRepo.Update(role)
}

func (s *AdminService) DeleteRole(roleID uint) error {
	role, err := s.roleRepo.GetByID(roleID)
	if err != nil {
		return err
	}
	if strings.EqualFold(role.Name, reservedAdminRoleName) {
		return fmt.Errorf("reserved admin role cannot be deleted")
	}
	return s.roleRepo.Delete(roleID)
}

func (s *AdminService) SetRolePolicies(roleID uint, req requests.SetRolePoliciesReq) error {
	role, err := s.roleRepo.GetByID(roleID)
	if err != nil {
		return err
	}
	if strings.EqualFold(role.Name, reservedAdminRoleName) {
		return fmt.Errorf("reserved admin role cannot be modified")
	}
	policies := make([]Policy, 0, len(req.Policies))
	for _, p := range req.Policies {
		policies = append(policies, Policy{Path: p.Path, Method: p.Method})
	}
	return s.casbin.SetRolePolicies(role.Name, policies)
}

func (s *AdminService) GetRolePolicies(roleID uint) ([]Policy, error) {
	role, err := s.roleRepo.GetByID(roleID)
	if err != nil {
		return nil, err
	}
	return s.casbin.GetRolePolicies(role.Name), nil
}

func (s *AdminService) ListSystemConfigs() ([]entities.SystemConfig, error) {
	return s.cfgRepo.List()
}

func (s *AdminService) UpsertSystemConfig(req requests.SystemConfigReq) error {
	item := &entities.SystemConfig{
		ConfigGroup: req.ConfigGroup,
		ConfigKey:   req.ConfigKey,
		ConfigVal:   req.ConfigVal,
		Remark:      req.Remark,
	}
	return s.cfgRepo.Upsert(item)
}
