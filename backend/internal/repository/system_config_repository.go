package repository

import (
	"backend/internal/models/entities"

	"gorm.io/gorm"
)

type SystemConfigRepository struct {
	db *gorm.DB
}

func NewSystemConfigRepository(db *gorm.DB) *SystemConfigRepository {
	return &SystemConfigRepository{db: db}
}

func (r *SystemConfigRepository) List() ([]entities.SystemConfig, error) {
	var list []entities.SystemConfig
	err := r.db.Order("config_group asc").Order("config_key asc").Order("id asc").Find(&list).Error
	return list, err
}

func (r *SystemConfigRepository) Upsert(item *entities.SystemConfig) error {
	var existing entities.SystemConfig
	err := r.db.Where("config_key = ?", item.ConfigKey).First(&existing).Error
	if err == nil {
		existing.ConfigGroup = item.ConfigGroup
		existing.ConfigVal = item.ConfigVal
		existing.Remark = item.Remark
		return r.db.Save(&existing).Error
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}
	return r.db.Create(item).Error
}

func (r *SystemConfigRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&entities.SystemConfig{}).Count(&count).Error
	return count, err
}
