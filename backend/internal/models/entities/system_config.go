package entities

import "time"

type SystemConfig struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ConfigGroup string    `gorm:"size:64;index;not null;default:''" json:"config_group"`
	ConfigKey string    `gorm:"size:128;uniqueIndex;not null" json:"config_key"`
	ConfigVal string    `gorm:"type:text;not null" json:"config_val"`
	Remark    string    `gorm:"size:255" json:"remark"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
