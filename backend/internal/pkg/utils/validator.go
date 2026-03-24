package utils

import (
	"fmt"
	"regexp"
	"strings"
)

var usernameRegex = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

func ValidateUsername(username string) error {
	username = strings.TrimSpace(username)
	if len(username) < 3 || len(username) > 32 {
		return fmt.Errorf("用户名长度必须在 3 到 32 个字符之间")
	}
	if !usernameRegex.MatchString(username) {
		return fmt.Errorf("用户名只允许字母、数字和下划线")
	}
	return nil
}

func ValidatePhone(phone string) error {
	phone = strings.TrimSpace(phone)
	if len(phone) < 11 || len(phone) > 20 {
		return fmt.Errorf("手机号格式不正确")
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("密码长度不能少于 8 位")
	}
	return nil
}
