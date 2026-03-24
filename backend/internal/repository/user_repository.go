package repository

import (
	"backend/internal/models/entities"
	"strings"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *entities.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) FindByUsername(username string) (*entities.User, error) {
	var user entities.User
	err := r.db.Preload("Roles").Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByPhone(phone string) (*entities.User, error) {
	var user entities.User
	err := r.db.Preload("Roles").Where("phone = ?", phone).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByEmail(email string) (*entities.User, error) {
	var user entities.User
	err := r.db.Preload("Roles").Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByAccount(account string) (*entities.User, error) {
	var user entities.User
	err := r.db.Preload("Roles").Where("username = ? OR phone = ?", account, account).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id uint) (*entities.User, error) {
	var user entities.User
	err := r.db.Preload("Roles").First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) ListUsers(keyword string) ([]entities.User, error) {
	var users []entities.User
	query := r.db.Preload("Roles").Order("id desc")
	if trimmed := strings.TrimSpace(keyword); trimmed != "" {
		like := "%" + trimmed + "%"
		query = query.Where("username ILIKE ? OR phone ILIKE ? OR email ILIKE ?", like, like, like)
	}
	err := query.Find(&users).Error
	return users, err
}

func (r *UserRepository) Update(user *entities.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) UpdatePassword(userID uint, passwordHash string) error {
	return r.db.Model(&entities.User{}).Where("id = ?", userID).Update("password_hash", passwordHash).Error
}

func (r *UserRepository) SetRoles(userID uint, roles []entities.Role) error {
	user := entities.User{ID: userID}
	return r.db.Model(&user).Association("Roles").Replace(&roles)
}

func (r *UserRepository) Delete(userID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		user := entities.User{ID: userID}
		if err := tx.Model(&user).Association("Roles").Clear(); err != nil {
			return err
		}
		return tx.Delete(&user).Error
	})
}

func (r *UserRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&entities.User{}).Count(&count).Error
	return count, err
}
