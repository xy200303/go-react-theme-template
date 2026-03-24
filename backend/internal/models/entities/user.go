package entities

import "time"

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"size:32;uniqueIndex;not null" json:"username"`
	Phone        string    `gorm:"size:20;uniqueIndex;not null" json:"phone"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Email        string    `gorm:"size:120;uniqueIndex:idx_users_email,where:email <> ''" json:"email"`
	AvatarURL    string    `gorm:"size:512" json:"avatar_url"`
	Signature    string    `gorm:"size:255" json:"signature"`
	Gender       string    `gorm:"size:10" json:"gender"`
	Age          int       `json:"age"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Roles        []Role    `gorm:"many2many:user_roles;" json:"roles,omitempty"`
}
