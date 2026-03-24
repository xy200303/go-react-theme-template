package main

import (
	"log"
	"net/http"

	"backend/internal/api/routes"
	"backend/internal/pkg/cache"
	"backend/internal/pkg/config"
	"backend/internal/pkg/database"
)

func main() {
	cfg, err := config.LoadConfig(".env")
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.NewPostgres(cfg)
	if err != nil {
		log.Fatalf("failed to initialize PostgreSQL: %v", err)
	}

	redisClient, err := cache.NewRedisClient(cfg)
	if err != nil {
		log.Fatalf("failed to initialize Redis: %v", err)
	}

	app, err := routes.NewAppContext(cfg, db, redisClient)
	if err != nil {
		log.Fatalf("failed to initialize app context: %v", err)
	}

	if err := database.AutoMigrateAndSeed(db, app); err != nil {
		log.Fatalf("failed to migrate database and seed data: %v", err)
	}

	r := routes.SetupRouter(app)
	srv := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: r,
	}

	log.Printf("server started: http://127.0.0.1:%s", cfg.ServerPort)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server stopped with error: %v", err)
	}
}