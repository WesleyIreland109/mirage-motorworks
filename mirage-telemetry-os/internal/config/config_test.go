package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadRejectsInvalidVehicle(t *testing.T) {
	root := t.TempDir()
	for _, d := range []string{"vehicles", "themes", "clients/test"} {
		if err := os.MkdirAll(filepath.Join(root, d), 0755); err != nil {
			t.Fatal(err)
		}
	}
	files := map[string]string{"vehicles/bad.yaml": "id: bad\nredlineRpm: 0\n", "themes/theme.yaml": "id: theme\nname: Test\n", "clients/test/branding.yaml": "id: test\nname: Test\n"}
	for p, v := range files {
		if err := os.WriteFile(filepath.Join(root, p), []byte(v), 0644); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := Load(root, "bad", "theme", "test"); err == nil {
		t.Fatal("expected validation error")
	}
}
