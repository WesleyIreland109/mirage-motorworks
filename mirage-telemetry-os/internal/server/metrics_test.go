package server

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/config"
	"github.com/mirage-motorworks/telemetry-os/internal/simulator"
)

func TestAttachmentPrometheusMetrics(t *testing.T) {
	provider := simulator.New(time.Second)
	if err := provider.Action("attach-adapter"); err != nil {
		t.Fatal(err)
	}
	if err := provider.Action("attach-fk8"); err != nil {
		t.Fatal(err)
	}
	api := New(config.Active{}, provider, true)
	request := httptest.NewRequest("GET", "/metrics", nil)
	response := httptest.NewRecorder()
	api.Handler().ServeHTTP(response, request)
	body := response.Body.String()
	for _, metric := range []string{"mirage_vehicle_interface_connected 1", "mirage_vehicle_ecu_connected 1", "mirage_vehicle_profile_match_confidence 1", "mirage_vehicle_supported_metrics 14"} {
		if !strings.Contains(body, metric) {
			t.Errorf("missing %q", metric)
		}
	}
}
