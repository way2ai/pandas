package storage_test

import (
	"testing"

	"github.com/way2ai/pandas/api/internal/storage"
)

func TestMigrationListContainsFoundationSchema(t *testing.T) {
	files := storage.MigrationFiles()
	if len(files) == 0 {
		t.Fatal("expected at least one migration")
	}
}
