package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"backend/internal/pkg/config"

	"github.com/redis/go-redis/v9"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	sms "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/sms/v20210111"
)

type SMSService struct {
	cfg   *config.Config
	redis *redis.Client
}

func NewSMSService(cfg *config.Config, redis *redis.Client) *SMSService {
	return &SMSService{cfg: cfg, redis: redis}
}

func (s *SMSService) SendCode(ctx context.Context, phone, scene string) error {
	if err := s.ensureTencentConfig(); err != nil {
		return err
	}
	code, err := generateCode(6)
	if err != nil {
		return fmt.Errorf("生成短信验证码失败")
	}

	if err := s.sendTencentSMS(phone, code); err != nil {
		return err
	}

	key := s.codeKey(scene, phone)
	if err := s.redis.Set(ctx, key, code, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("保存短信验证码失败")
	}
	return nil
}

func (s *SMSService) VerifyCode(ctx context.Context, phone, scene, code string) error {
	key := s.codeKey(scene, phone)
	cached, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("验证码已过期或不存在")
	}
	if strings.TrimSpace(cached) != strings.TrimSpace(code) {
		return fmt.Errorf("验证码错误")
	}
	_ = s.redis.Del(ctx, key).Err()
	return nil
}

func (s *SMSService) ensureTencentConfig() error {
	if s.cfg.TencentSMSSecretID == "" || s.cfg.TencentSMSSecretKey == "" || s.cfg.TencentSMSSDKAppID == "" || s.cfg.TencentSMSSignName == "" || s.cfg.TencentSMSTemplate == "" {
		return fmt.Errorf("腾讯云短信配置不完整")
	}
	return nil
}

func (s *SMSService) sendTencentSMS(phone, code string) error {
	cred := common.NewCredential(s.cfg.TencentSMSSecretID, s.cfg.TencentSMSSecretKey)
	cpf := profile.NewClientProfile()
	cpf.HttpProfile.Endpoint = "sms.tencentcloudapi.com"
	client, err := sms.NewClient(cred, s.cfg.TencentSMSRegion, cpf)
	if err != nil {
		return fmt.Errorf("创建腾讯云短信客户端失败")
	}

	request := sms.NewSendSmsRequest()
	request.PhoneNumberSet = common.StringPtrs([]string{normalizePhone(phone)})
	request.SmsSdkAppId = common.StringPtr(s.cfg.TencentSMSSDKAppID)
	request.SignName = common.StringPtr(s.cfg.TencentSMSSignName)
	request.TemplateId = common.StringPtr(s.cfg.TencentSMSTemplate)
	request.TemplateParamSet = common.StringPtrs([]string{code})

	resp, err := client.SendSms(request)
	if err != nil {
		return fmt.Errorf("短信发送失败：%v", err)
	}

	if len(resp.Response.SendStatusSet) == 0 {
		return fmt.Errorf("短信平台返回结果为空")
	}

	status := resp.Response.SendStatusSet[0]
	if status.Code == nil || *status.Code != "Ok" {
		msg := "未知错误"
		if status.Message != nil {
			msg = localizeTencentSMSMessage(*status.Code, *status.Message)
		}
		return fmt.Errorf("短信发送失败：%s", msg)
	}
	return nil
}

func (s *SMSService) codeKey(scene, phone string) string {
	return fmt.Sprintf("sms:%s:%s", scene, phone)
}

func normalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	if strings.HasPrefix(phone, "+") {
		return phone
	}
	return "+86" + phone
}

func generateCode(length int) (string, error) {
	var result strings.Builder
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		result.WriteString(n.String())
	}
	return result.String(), nil
}

func localizeTencentSMSMessage(code, message string) string {
	switch code {
	case "FailedOperation.TemplateParamSetNotMatchApprovedTemplate":
		return "短信模板参数与已审核模板内容不匹配"
	case "FailedOperation.SignatureIncorrectOrUnapproved":
		return "短信签名未通过审核或签名内容不正确"
	case "FailedOperation.TemplateIncorrectOrUnapproved":
		return "短信模板未通过审核或模板内容不正确"
	case "FailedOperation.PhoneNumberInBlacklist":
		return "手机号命中短信黑名单，暂时无法发送"
	case "FailedOperation.InsufficientBalance":
		return "短信账户余额不足"
	case "InvalidParameterValue.PhoneNumber":
		return "手机号格式不正确"
	default:
		if strings.TrimSpace(message) != "" {
			return message
		}
		return "未知错误"
	}
}
