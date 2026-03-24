package database

import (
	"fmt"

	"backend/internal/api/routes"
	"backend/internal/models/entities"
	"backend/internal/pkg/utils"
	"backend/internal/service"
	"gorm.io/gorm"
)

func AutoMigrateAndSeed(db *gorm.DB, app *routes.AppContext) error {
	if err := db.AutoMigrate(
		&entities.User{},
		&entities.Role{},
		&entities.UserRole{},
		&entities.SystemConfig{},
	); err != nil {
		return fmt.Errorf("auto migrate failed: %w", err)
	}

	userRole := entities.Role{Name: "user", DisplayName: "User", Description: "default user role"}
	if err := db.Where("name = ?", userRole.Name).FirstOrCreate(&userRole).Error; err != nil {
		return err
	}
	adminRole := entities.Role{Name: "admin", DisplayName: "Admin", Description: "system administrator role"}
	if err := db.Where("name = ?", adminRole.Name).FirstOrCreate(&adminRole).Error; err != nil {
		return err
	}

	if err := seedDefaultPolicies(app.CasbinService); err != nil {
		return err
	}

	if err := seedInitAdmin(db, app, adminRole); err != nil {
		return err
	}

	return nil
}

func seedInitAdmin(db *gorm.DB, app *routes.AppContext, adminRole entities.Role) error {
	var existing entities.User
	err := db.Preload("Roles").Where("username = ? OR phone = ?", app.Config.InitAdminUsername, app.Config.InitAdminPhone).First(&existing).Error
	if err == nil {
		hasAdmin := false
		for _, role := range existing.Roles {
			if role.Name == "admin" {
				hasAdmin = true
				break
			}
		}
		if hasAdmin {
			return nil
		}
		return db.Model(&existing).Association("Roles").Append(&adminRole)
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}

	hash, err := utils.HashPassword(app.Config.InitAdminPassword)
	if err != nil {
		return err
	}

	admin := &entities.User{
		Username:     app.Config.InitAdminUsername,
		Phone:        app.Config.InitAdminPhone,
		PasswordHash: hash,
		IsActive:     true,
	}
	if err := db.Create(admin).Error; err != nil {
		return err
	}
	return db.Model(admin).Association("Roles").Append(&adminRole)
}

func seedDefaultPolicies(casbinSvc *service.CasbinService) error {
	if err := casbinSvc.SetRolePolicies("user", []service.Policy{
		{Path: "/api/v1/user/*", Method: "(GET|PUT|POST)"},
	}); err != nil {
		return err
	}
	if err := casbinSvc.SetRolePolicies("admin", []service.Policy{
		{Path: "/api/v1/admin/*", Method: "(GET|POST|PUT|DELETE)"},
		{Path: "/api/v1/user/*", Method: "(GET|PUT|POST)"},
	}); err != nil {
		return err
	}
	return nil
}
