package repository

import (
	"backend/internal/models/entities"

	"gorm.io/gorm"
)

type RoleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

func (r *RoleRepository) Create(role *entities.Role) error {
	return r.db.Create(role).Error
}

func (r *RoleRepository) GetByName(name string) (*entities.Role, error) {
	var role entities.Role
	err := r.db.Where("name = ?", name).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepository) GetByID(id uint) (*entities.Role, error) {
	var role entities.Role
	err := r.db.First(&role, id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepository) List() ([]entities.Role, error) {
	var roles []entities.Role
	err := r.db.Order("id asc").Find(&roles).Error
	return roles, err
}

func (r *RoleRepository) Update(role *entities.Role) error {
	return r.db.Save(role).Error
}

func (r *RoleRepository) Delete(id uint) error {
	return r.db.Delete(&entities.Role{}, id).Error
}

func (r *RoleRepository) FindByNames(names []string) ([]entities.Role, error) {
	var roles []entities.Role
	err := r.db.Where("name IN ?", names).Find(&roles).Error
	return roles, err
}

func (r *RoleRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&entities.Role{}).Count(&count).Error
	return count, err
}
