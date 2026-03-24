package service

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/pkg/config"
	"github.com/google/uuid"
	"github.com/tencentyun/cos-go-sdk-v5"
)

type StorageService struct {
	cfg *config.Config
}

func NewStorageService(cfg *config.Config) *StorageService {
	return &StorageService{cfg: cfg}
}

func (s *StorageService) Upload(fileHeader *multipart.FileHeader) (string, error) {
	if err := s.validate(fileHeader); err != nil {
		return "", err
	}

	driver := strings.ToLower(s.cfg.UploadDriver)
	if driver == "cos" || driver == "auto" || driver == "" {
		if s.canUseCOS() {
			url, err := s.uploadToCOS(fileHeader)
			if err == nil {
				return url, nil
			}
			if driver == "cos" {
				return "", err
			}
		}
	}

	return s.uploadToLocal(fileHeader)
}

func (s *StorageService) validate(fileHeader *multipart.FileHeader) error {
	if fileHeader.Size > s.cfg.UploadMaxSizeMB*1024*1024 {
		return fmt.Errorf("file too large, max %dMB", s.cfg.UploadMaxSizeMB)
	}
	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(fileHeader.Filename)), ".")
	allowed := map[string]struct{}{}
	for _, item := range s.cfg.AllowedUploadSuffix {
		allowed[item] = struct{}{}
	}
	if _, ok := allowed[ext]; !ok {
		return fmt.Errorf("unsupported file extension: %s", ext)
	}
	return nil
}

func (s *StorageService) canUseCOS() bool {
	return s.cfg.COSSecretID != "" && s.cfg.COSSecretKey != "" && s.cfg.COSBucketURL != ""
}

func (s *StorageService) uploadToCOS(fileHeader *multipart.FileHeader) (string, error) {
	bucketURL, err := url.Parse(s.cfg.COSBucketURL)
	if err != nil {
		return "", fmt.Errorf("invalid COS bucket URL: %w", err)
	}

	client := cos.NewClient(&cos.BaseURL{BucketURL: bucketURL}, &http.Client{
		Transport: &cos.AuthorizationTransport{
			SecretID:  s.cfg.COSSecretID,
			SecretKey: s.cfg.COSSecretKey,
		},
	})

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	key := fmt.Sprintf("uploads/%d_%s%s", time.Now().UnixMilli(), uuid.NewString(), strings.ToLower(filepath.Ext(fileHeader.Filename)))
	_, err = client.Object.Put(nil, key, file, nil)
	if err != nil {
		return "", fmt.Errorf("failed to upload to COS: %w", err)
	}

	base := strings.TrimSuffix(s.cfg.COSBaseURL, "/")
	if base != "" {
		return base + "/" + key, nil
	}
	return strings.TrimSuffix(s.cfg.COSBucketURL, "/") + "/" + key, nil
}

func (s *StorageService) uploadToLocal(fileHeader *multipart.FileHeader) (string, error) {
	if err := os.MkdirAll(s.cfg.UploadLocalPath, 0o755); err != nil {
		return "", err
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	name := fmt.Sprintf("%d_%s%s", time.Now().UnixMilli(), uuid.NewString(), ext)
	fullPath := filepath.Join(s.cfg.UploadLocalPath, name)

	src, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	return "/static/uploads/" + name, nil
}