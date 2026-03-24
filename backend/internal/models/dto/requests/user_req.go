package requests

type UpdateProfileReq struct {
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	Signature string `json:"signature"`
	Gender    string `json:"gender"`
	Age       int    `json:"age"`
}

type ResetPasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

type ChangePhoneReq struct {
	OldPhoneCode string `json:"old_phone_code" binding:"required"`
	NewPhone     string `json:"new_phone" binding:"required"`
	NewPhoneCode string `json:"new_phone_code" binding:"required"`
}
