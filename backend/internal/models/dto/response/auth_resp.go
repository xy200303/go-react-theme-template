package response

type TokenResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type LoginResp struct {
	Token TokenResp `json:"token"`
	User  UserResp  `json:"user"`
}
