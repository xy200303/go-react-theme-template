package service

import (
	"context"
	"fmt"
	"mime/multipart"
	"strings"

	"backend/internal/models/dto/requests"
	"backend/internal/models/dto/response"
	"backend/internal/models/mapper"
	"backend/internal/pkg/utils"
	"backend/internal/repository"

	"gorm.io/gorm"
)

type UserService struct {
	userRepo       *repository.UserRepository
	smsService     *SMSService
	storageService *StorageService
}

func NewUserService(userRepo *repository.UserRepository, smsService *SMSService, storageService *StorageService) *UserService {
	return &UserService{userRepo: userRepo, smsService: smsService, storageService: storageService}
}

func (s *UserService) GetProfile(userID uint) (*response.UserResp, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	resp := mapper.ToUserResp(*user)
	return &resp, nil
}

func (s *UserService) UpdateProfile(userID uint, req requests.UpdateProfileReq) (*response.UserResp, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	email := strings.TrimSpace(req.Email)
	if email != "" {
		existingByEmail, err := s.userRepo.FindByEmail(email)
		if err == nil && existingByEmail.ID != userID {
			return nil, fmt.Errorf("email already exists")
		} else if err != nil && err != gorm.ErrRecordNotFound {
			return nil, err
		}
	}

	user.Email = email
	if strings.TrimSpace(req.AvatarURL) != "" {
		user.AvatarURL = strings.TrimSpace(req.AvatarURL)
	}
	user.Signature = strings.TrimSpace(req.Signature)
	user.Gender = strings.TrimSpace(req.Gender)
	user.Age = req.Age

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	resp := mapper.ToUserResp(*user)
	return &resp, nil
}

func (s *UserService) ResetPassword(userID uint, req requests.ResetPasswordReq) error {
	if err := utils.ValidatePassword(req.NewPassword); err != nil {
		return err
	}
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}
	if !utils.ComparePassword(user.PasswordHash, req.OldPassword) {
		return fmt.Errorf("old password mismatch")
	}
	newHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}
	return s.userRepo.UpdatePassword(userID, newHash)
}

func (s *UserService) ChangePhone(ctx context.Context, userID uint, req requests.ChangePhoneReq) error {
	if err := utils.ValidatePhone(req.NewPhone); err != nil {
		return err
	}
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	if err := s.smsService.VerifyCode(ctx, user.Phone, "change_phone_old", req.OldPhoneCode); err != nil {
		return fmt.Errorf("old phone verification failed: %w", err)
	}
	if err := s.smsService.VerifyCode(ctx, req.NewPhone, "change_phone_new", req.NewPhoneCode); err != nil {
		return fmt.Errorf("new phone verification failed: %w", err)
	}

	newPhone := strings.TrimSpace(req.NewPhone)
	existingByPhone, err := s.userRepo.FindByPhone(newPhone)
	if err == nil && existingByPhone.ID != userID {
		return fmt.Errorf("phone already exists")
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	user.Phone = newPhone
	return s.userRepo.Update(user)
}

func (s *UserService) UploadAvatar(userID uint, fileHeader *multipart.FileHeader) (string, error) {
	url, err := s.storageService.Upload(fileHeader)
	if err != nil {
		return "", err
	}
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", fmt.Errorf("user not found")
	}
	user.AvatarURL = url
	if err := s.userRepo.Update(user); err != nil {
		return "", err
	}
	return url, nil
}
