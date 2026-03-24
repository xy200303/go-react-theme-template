package mapper

import (
	"backend/internal/models/dto/response"
	"backend/internal/models/entities"
)

func ToUserResp(user entities.User) response.UserResp {
	roles := make([]string, 0, len(user.Roles))
	for _, r := range user.Roles {
		roles = append(roles, r.Name)
	}
	return response.UserResp{
		ID:        user.ID,
		Username:  user.Username,
		Phone:     user.Phone,
		Email:     user.Email,
		AvatarURL: user.AvatarURL,
		Signature: user.Signature,
		Gender:    user.Gender,
		Age:       user.Age,
		IsActive:  user.IsActive,
		Roles:     roles,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}
