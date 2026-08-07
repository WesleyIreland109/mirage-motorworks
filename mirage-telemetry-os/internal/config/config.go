package config

import (
	"fmt"
	"gopkg.in/yaml.v3"
	"os"
	"path/filepath"
)

type Thresholds struct {
	CoolantTempHigh   float64 `yaml:"coolantTempHigh" json:"coolantTempHigh"`
	OilTempHigh       float64 `yaml:"oilTempHigh" json:"oilTempHigh"`
	OilPressureLow    float64 `yaml:"oilPressureLow" json:"oilPressureLow"`
	BatteryVoltageLow float64 `yaml:"batteryVoltageLow" json:"batteryVoltageLow"`
}
type ShiftLights struct {
	Enabled    bool    `yaml:"enabled" json:"enabled"`
	StartRPM   float64 `yaml:"startRpm" json:"startRpm"`
	WarningRPM float64 `yaml:"warningRpm" json:"warningRpm"`
	RedlineRPM float64 `yaml:"redlineRpm" json:"redlineRpm"`
}
type Vehicle struct {
	ID                string      `yaml:"id" json:"id"`
	DisplayName       string      `yaml:"displayName" json:"displayName"`
	OSName            string      `yaml:"osName" json:"osName"`
	Manufacturer      string      `yaml:"manufacturer" json:"manufacturer"`
	Model             string      `yaml:"model" json:"model"`
	Generation        string      `yaml:"generation" json:"generation"`
	YearRange         string      `yaml:"yearRange" json:"yearRange"`
	RedlineRPM        float64     `yaml:"redlineRpm" json:"redlineRpm"`
	SpeedUnit         string      `yaml:"speedUnit" json:"speedUnit"`
	TemperatureUnit   string      `yaml:"temperatureUnit" json:"temperatureUnit"`
	PressureUnit      string      `yaml:"pressureUnit" json:"pressureUnit"`
	SupportedMetrics  []string    `yaml:"supportedMetrics" json:"supportedMetrics"`
	PreferredLayout   string      `yaml:"preferredLayout" json:"preferredLayout"`
	WarningThresholds Thresholds  `yaml:"warningThresholds" json:"warningThresholds"`
	ShiftLights       ShiftLights `yaml:"shiftLights" json:"shiftLights"`
	StartupText       string      `yaml:"startupText" json:"startupText"`
}
type Theme struct {
	ID               string            `yaml:"id" json:"id"`
	Name             string            `yaml:"name" json:"name"`
	Colors           map[string]string `yaml:"colors" json:"colors"`
	FontDisplay      string            `yaml:"fontDisplay" json:"fontDisplay"`
	GlowStrength     float64           `yaml:"glowStrength" json:"glowStrength"`
	ScanlineStrength float64           `yaml:"scanlineStrength" json:"scanlineStrength"`
}
type Client struct {
	ID          string `yaml:"id" json:"id"`
	Name        string `yaml:"name" json:"name"`
	SystemName  string `yaml:"systemName" json:"systemName"`
	Tagline     string `yaml:"tagline" json:"tagline"`
	StartupText string `yaml:"startupText" json:"startupText"`
	FooterText  string `yaml:"footerText" json:"footerText"`
	Logo        string `yaml:"logo" json:"logo"`
}
type OBD struct {
	AutoDiscovery    bool     `yaml:"autoDiscovery" json:"autoDiscovery"`
	PreferredAdapter string   `yaml:"preferredAdapter" json:"preferredAdapter"`
	PreferredPort    string   `yaml:"preferredPort" json:"preferredPort"`
	BaudRate         int      `yaml:"baudRate" json:"baudRate"`
	Initialization   []string `yaml:"initialization" json:"initialization"`
	KnownUSBIDs      []string `yaml:"knownUSBIDs" json:"knownUSBIDs"`
}
type Active struct {
	Vehicle Vehicle `json:"vehicle"`
	Theme   Theme   `json:"theme"`
	Client  Client  `json:"client"`
	OBD     OBD     `json:"obd"`
}

func Load(root, vehicle, theme, client string) (Active, error) {
	var out Active
	items := []struct {
		path   string
		target any
	}{{filepath.Join(root, "vehicles", vehicle+".yaml"), &out.Vehicle}, {filepath.Join(root, "themes", theme+".yaml"), &out.Theme}, {filepath.Join(root, "clients", client, "branding.yaml"), &out.Client}, {filepath.Join(root, "obd.yaml"), &out.OBD}}
	for _, item := range items {
		data, err := os.ReadFile(item.path)
		if err != nil {
			return out, fmt.Errorf("%s: %w", item.path, err)
		}
		if err = yaml.Unmarshal(data, item.target); err != nil {
			return out, fmt.Errorf("%s: %w", item.path, err)
		}
	}
	if out.Vehicle.ID == "" {
		return out, fmt.Errorf("config/vehicles/%s.yaml field id: expected non-empty value", vehicle)
	}
	if out.Vehicle.RedlineRPM <= 0 {
		return out, fmt.Errorf("config/vehicles/%s.yaml field redlineRpm: invalid %v; expected positive number", vehicle, out.Vehicle.RedlineRPM)
	}
	if out.Theme.ID == "" || out.Client.ID == "" {
		return out, fmt.Errorf("theme and client id fields must be non-empty")
	}
	return out, nil
}
