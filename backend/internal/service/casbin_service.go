package service

import (
	"fmt"
	"path/filepath"

	"github.com/casbin/casbin/v2"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"gorm.io/gorm"
)

type Policy struct {
	Path   string `json:"path"`
	Method string `json:"method"`
}

type CasbinService struct {
	enforcer *casbin.Enforcer
}

func NewCasbinService(db *gorm.DB) (*CasbinService, error) {
	adapter, err := gormadapter.NewAdapterByDB(db)
	if err != nil {
		return nil, fmt.Errorf("failed to create Casbin adapter: %w", err)
	}
	modelPath := filepath.Join("configs", "rbac_model.conf")
	enforcer, err := casbin.NewEnforcer(modelPath, adapter)
	if err != nil {
		return nil, fmt.Errorf("failed to create Casbin enforcer: %w", err)
	}
	if err := enforcer.LoadPolicy(); err != nil {
		return nil, fmt.Errorf("failed to load Casbin policy: %w", err)
	}
	return &CasbinService{enforcer: enforcer}, nil
}

func (s *CasbinService) Enforce(roles []string, path, method string) (bool, error) {
	for _, role := range roles {
		if role == "admin" {
			return true, nil
		}
		ok, err := s.enforcer.Enforce(role, path, method)
		if err != nil {
			return false, err
		}
		if ok {
			return true, nil
		}
	}
	return false, nil
}

func (s *CasbinService) SetRolePolicies(role string, policies []Policy) error {
	_, _ = s.enforcer.RemoveFilteredPolicy(0, role)
	for _, p := range policies {
		if _, err := s.enforcer.AddPolicy(role, p.Path, p.Method); err != nil {
			return err
		}
	}
	return s.enforcer.SavePolicy()
}

func (s *CasbinService) GetRolePolicies(role string) []Policy {
	policy, err := s.enforcer.GetFilteredPolicy(0, role)
	if err != nil {
		return []Policy{}
	}
	result := make([]Policy, 0, len(policy))
	for _, row := range policy {
		if len(row) < 3 {
			continue
		}
		result = append(result, Policy{Path: row[1], Method: row[2]})
	}
	return result
}