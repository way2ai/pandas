package storage

import (
	"embed"
	"io/fs"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// MigrationFiles returns the embedded migration file paths in declaration order.
func MigrationFiles() []string {
	files, _ := fs.Glob(migrationFS, "migrations/*.sql")
	return files
}
