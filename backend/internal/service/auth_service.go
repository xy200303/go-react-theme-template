package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"backend/internal/models/dto/requests"
	"backend/internal/models/dto/response"
	"backend/internal/models/entities"
	"backend/internal/models/mapper"
	"backend/internal/pkg/config"
	"backend/internal/pkg/utils"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthService struct {
	cfg         *config.Config
	userRepo    *repository.UserRepository
	roleRepo    *repository.RoleRepository
	refreshRepo *repository.RefreshTokenRepository
	smsService  *SMSService
}

func NewAuthService(
	cfg *config.Config,
	userRepo *repository.UserRepository,
	roleRepo *repository.RoleRepository,
	refreshRepo *repository.RefreshTokenRepository,
	smsService *SMSService,
) *AuthService {
	return &AuthService{
		cfg:         cfg,
		userRepo:    userRepo,
		roleRepo:    roleRepo,
		refreshRepo: refreshRepo,
		smsService:  smsService,
	}
}

func (s *AuthService) SendSMSCode(ctx context.Context, req requests.SendSMSCodeReq) error {
	if err := utils.ValidatePhone(req.Phone); err != nil {
		return err
	}
	if strings.TrimSpace(req.Scene) == "" {
		return fmt.Errorf("验证码场景不能为空")
	}
	return s.smsService.SendCode(ctx, req.Phone, req.Scene)
}

func (s *AuthService) Register(ctx context.Context, req requests.RegisterReq) (*response.LoginResp, error) {
	if err := utils.ValidateUsername(req.Username); err != nil {
		return nil, err
	}
	if err := utils.ValidatePhone(req.Phone); err != nil {
		return nil, err
	}
	if err := utils.ValidatePassword(req.Password); err != nil {
		return nil, err
	}
	if s.cfg.SMSVerifyEnabled {
		if strings.TrimSpace(req.Code) == "" {
			return nil, fmt.Errorf("请输入短信验证码")
		}
		if err := s.smsService.VerifyCode(ctx, req.Phone, "register", req.Code); err != nil {
			return nil, err
		}
	}

	if _, err := s.userRepo.FindByUsername(req.Username); err == nil {
		return nil, fmt.Errorf("用户名已存在")
	} else if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	if _, err := s.userRepo.FindByPhone(req.Phone); err == nil {
		return nil, fmt.Errorf("手机号已存在")
	} else if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	pwdHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &entities.User{
		Username:     strings.TrimSpace(req.Username),
		Phone:        strings.TrimSpace(req.Phone),
		PasswordHash: pwdHash,
		IsActive:     true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	role, err := s.roleRepo.GetByName("user")
	if err == nil {
		if err := s.userRepo.SetRoles(user.ID, []entities.Role{*role}); err != nil {
			return nil, err
		}
	}

	freshUser, err := s.userRepo.FindByID(user.ID)
	if err != nil {
		return nil, err
	}
	return s.issueLoginResp(ctx, *freshUser)
}

func (s *AuthService) LoginWithPassword(ctx context.Context, req requests.PasswordLoginReq) (*response.LoginResp, error) {
	user, err := s.userRepo.FindByAccount(strings.TrimSpace(req.Account))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("账号不存在")
		}
		return nil, fmt.Errorf("查询账号信息失败")
	}
	if !user.IsActive {
		return nil, fmt.Errorf("账号已被禁用")
	}
	if !utils.ComparePassword(user.PasswordHash, req.Password) {
		return nil, fmt.Errorf("密码错误")
	}
	return s.issueLoginResp(ctx, *user)
}

func (s *AuthService) LoginWithSMS(ctx context.Context, req requests.SMSLoginReq) (*response.LoginResp, error) {
	if err := s.smsService.VerifyCode(ctx, req.Phone, "login", req.Code); err != nil {
		return nil, err
	}
	user, err := s.userRepo.FindByPhone(strings.TrimSpace(req.Phone))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("该手机号尚未注册")
		}
		return nil, fmt.Errorf("查询账号信息失败")
	}
	if !user.IsActive {
		return nil, fmt.Errorf("账号已被禁用")
	}
	return s.issueLoginResp(ctx, *user)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*response.TokenResp, error) {
	claims, err := utils.ParseToken(s.cfg.JWTRefreshSecret, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("刷新令牌无效")
	}
	if claims.Type != utils.TokenTypeRefresh {
		return nil, fmt.Errorf("令牌类型不正确")
	}

	exists, err := s.refreshRepo.Exists(ctx, claims.JTI)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("刷新令牌已失效")
	}

	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("用户不存在")
	}

	_ = s.refreshRepo.Delete(ctx, claims.JTI)
	pair, err := s.issueTokenPair(ctx, *user)
	if err != nil {
		return nil, err
	}
	return &pair, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	claims, err := utils.ParseToken(s.cfg.JWTRefreshSecret, refreshToken)
	if err != nil {
		return fmt.Errorf("刷新令牌无效")
	}
	return s.refreshRepo.Delete(ctx, claims.JTI)
}

func (s *AuthService) issueLoginResp(ctx context.Context, user entities.User) (*response.LoginResp, error) {
	pair, err := s.issueTokenPair(ctx, user)
	if err != nil {
		return nil, err
	}
	resp := &response.LoginResp{
		Token: pair,
		User:  mapper.ToUserResp(user),
	}
	return resp, nil
}

func (s *AuthService) issueTokenPair(ctx context.Context, user entities.User) (response.TokenResp, error) {
	roles := make([]string, 0, len(user.Roles))
	for _, r := range user.Roles {
		roles = append(roles, r.Name)
	}

	accessJTI := uuid.NewString()
	accessToken, err := utils.GenerateToken(s.cfg.JWTAccessSecret, s.cfg.AccessExpireDuration(), utils.CustomClaims{
		UserID:   user.ID,
		Username: user.Username,
		Roles:    roles,
		Type:     utils.TokenTypeAccess,
		JTI:      accessJTI,
	})
	if err != nil {
		return response.TokenResp{}, err
	}

	refreshJTI := uuid.NewString()
	refreshToken, err := utils.GenerateToken(s.cfg.JWTRefreshSecret, s.cfg.RefreshExpireDuration(), utils.CustomClaims{
		UserID:   user.ID,
		Username: user.Username,
		Roles:    roles,
		Type:     utils.TokenTypeRefresh,
		JTI:      refreshJTI,
	})
	if err != nil {
		return response.TokenResp{}, err
	}

	if err := s.refreshRepo.Save(ctx, refreshJTI, user.ID, s.cfg.RefreshExpireDuration()); err != nil {
		return response.TokenResp{}, err
	}

	return response.TokenResp{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.cfg.AccessExpireDuration() / time.Second),
	}, nil
}
