package routes

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"backend/internal/api/controllers"
	"backend/internal/api/middleware"
	"backend/internal/pkg/config"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type AppContext struct {
	Config *config.Config
	DB     *gorm.DB
	Redis  *redis.Client

	CasbinService  *service.CasbinService
	AuthService    *service.AuthService
	UserService    *service.UserService
	AdminService   *service.AdminService
	StorageService *service.StorageService
	SMSService     *service.SMSService

	AuthController  *controllers.AuthController
	UserController  *controllers.UserController
	AdminController *controllers.AdminController
}

func NewAppContext(cfg *config.Config, db *gorm.DB, redis *redis.Client) (*AppContext, error) {
	userRepo := repository.NewUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	cfgRepo := repository.NewSystemConfigRepository(db)
	refreshRepo := repository.NewRefreshTokenRepository(redis)

	casbinService, err := service.NewCasbinService(db)
	if err != nil {
		return nil, err
	}

	smsService := service.NewSMSService(cfg, redis)
	storageService := service.NewStorageService(cfg)
	authService := service.NewAuthService(cfg, userRepo, roleRepo, refreshRepo, smsService)
	userService := service.NewUserService(userRepo, smsService, storageService)
	adminService := service.NewAdminService(userRepo, roleRepo, cfgRepo, casbinService, redis)

	ctx := &AppContext{
		Config:         cfg,
		DB:             db,
		Redis:          redis,
		CasbinService:  casbinService,
		AuthService:    authService,
		UserService:    userService,
		AdminService:   adminService,
		StorageService: storageService,
		SMSService:     smsService,
	}

	ctx.AuthController = controllers.NewAuthController(authService)
	ctx.UserController = controllers.NewUserController(userService)
	ctx.AdminController = controllers.NewAdminController(adminService)

	return ctx, nil
}

func SetupRouter(app *AppContext) *gin.Engine {
	gin.SetMode(app.Config.ServerMode)
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve local uploaded files.
	r.Static("/static/uploads", app.Config.UploadLocalPath)

	api := r.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/sms/send", app.AuthController.SendSMSCode)
			auth.POST("/register", app.AuthController.Register)
			auth.POST("/login/password", app.AuthController.PasswordLogin)
			auth.POST("/login/sms", app.AuthController.SMSLogin)
			auth.POST("/refresh", app.AuthController.Refresh)
			auth.POST("/logout", app.AuthController.Logout)
		}

		secured := api.Group("")
		secured.Use(middleware.AuthMiddleware(app.Config), middleware.RBACMiddleware(app.CasbinService))
		{
			user := secured.Group("/user")
			{
				user.GET("/profile", app.UserController.GetProfile)
				user.PUT("/profile", app.UserController.UpdateProfile)
				user.POST("/password/reset", app.UserController.ResetPassword)
				user.POST("/phone/change", app.UserController.ChangePhone)
				user.POST("/avatar/upload", app.UserController.UploadAvatar)
			}

			admin := secured.Group("/admin")
			admin.Use(middleware.RequireAdmin())
			{
				admin.GET("/stats", app.AdminController.Stats)
				admin.GET("/policy-templates", app.AdminController.ListPolicyTemplates)
				admin.GET("/users", app.AdminController.ListUsers)
				admin.POST("/users", app.AdminController.CreateUser)
				admin.PUT("/users/:id", app.AdminController.UpdateUser)
				admin.DELETE("/users/:id", app.AdminController.DeleteUser)
				admin.PUT("/users/:id/password", app.AdminController.ResetUserPassword)
				admin.PUT("/users/:id/roles", app.AdminController.UpdateUserRoles)
				admin.GET("/roles", app.AdminController.ListRoles)
				admin.POST("/roles", app.AdminController.CreateRole)
				admin.PUT("/roles/:id", app.AdminController.UpdateRole)
				admin.DELETE("/roles/:id", app.AdminController.DeleteRole)
				admin.GET("/roles/:id/policies", app.AdminController.GetRolePolicies)
				admin.PUT("/roles/:id/policies", app.AdminController.SetRolePolicies)
				admin.GET("/system-configs", app.AdminController.ListSystemConfigs)
				admin.PUT("/system-configs", app.AdminController.UpsertSystemConfig)
			}
		}
	}

	registerStaticWeb(r, app.Config.FrontendDistDir)
	return r
}

func registerStaticWeb(r *gin.Engine, distDir string) {
	indexPath := filepath.Join(distDir, "index.html")
	r.NoRoute(func(c *gin.Context) {
		requestPath := c.Request.URL.Path
		if requestPath != "" && requestPath != "/" {
			relativePath := strings.TrimPrefix(requestPath, "/")
			staticPath := filepath.Clean(filepath.Join(distDir, relativePath))
			distAbs, err1 := filepath.Abs(distDir)
			fileAbs, err2 := filepath.Abs(staticPath)
			if err1 == nil && err2 == nil {
				prefix := distAbs + string(os.PathSeparator)
				if fileAbs == distAbs || strings.HasPrefix(fileAbs, prefix) {
					if fi, err := os.Stat(fileAbs); err == nil && !fi.IsDir() {
						c.File(fileAbs)
						return
					}
				}
			}
		}

		if _, err := os.Stat(indexPath); err == nil {
			c.File(indexPath)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "not found"})
	})
}
