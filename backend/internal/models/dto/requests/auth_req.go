package requests

type SendSMSCodeReq struct {
	Phone string `json:"phone" binding:"required"`
	Scene string `json:"scene" binding:"required"`
}

type RegisterReq struct {
	Username string `json:"username" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
	Code     string `json:"code"`
}

type PasswordLoginReq struct {
	Account  string `json:"account" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type SMSLoginReq struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

type RefreshTokenReq struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutReq struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}
