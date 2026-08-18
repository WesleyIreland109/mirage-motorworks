package server

import (
	"net/url"
	"testing"
)

func TestLocalOrigin(t *testing.T) {
	tests := []struct {
		origin string
		want   bool
	}{
		{"http://localhost:8081", true},
		{"http://127.0.0.1:5173", true},
		{"http://mirage.local:8080", true},
		{"https://mirage.local", true},
		{"https://example.com", false},
		{"https://notmirage.local.example.com", false},
	}
	for _, test := range tests {
		t.Run(test.origin, func(t *testing.T) {
			origin, err := url.Parse(test.origin)
			if err != nil {
				t.Fatal(err)
			}
			if got := localOrigin(origin, "mirage.local:8080"); got != test.want {
				t.Fatalf("localOrigin(%q) = %v, want %v", test.origin, got, test.want)
			}
		})
	}
}
