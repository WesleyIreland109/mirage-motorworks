package vehicle

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type Confidence string

const (
	ConfidenceUnknown Confidence = "UNKNOWN"
	ConfidenceLow     Confidence = "LOW"
	ConfidenceMedium  Confidence = "MEDIUM"
	ConfidenceHigh    Confidence = "HIGH"
)

type Field struct {
	Value      string  `json:"value"`
	Confidence float64 `json:"confidence"`
	Source     string  `json:"source"`
}

type Identity struct {
	VIN          Field    `json:"vin"`
	Manufacturer Field    `json:"manufacturer"`
	Make         Field    `json:"make"`
	Model        Field    `json:"model"`
	Generation   Field    `json:"generation"`
	Trim         Field    `json:"trim"`
	ModelYear    Field    `json:"modelYear"`
	Engine       Field    `json:"engine"`
	Confidence   float64  `json:"confidence"`
	Sources      []string `json:"sources"`
}

type Evidence struct {
	VIN, Protocol, ManufacturerHint, ModelHint, GenerationHint, TrimHint string
	TelemetrySource                                                      string
	ModelYearHint                                                        int
	SupportedPIDs                                                        map[string]bool
}

type DecodedVIN struct {
	VIN, WMI, Manufacturer, Make, Model, Trim, Engine string
	ModelYear                                         int
}

type VINDecoder interface {
	Decode(context.Context, string) (DecodedVIN, error)
}

type VehicleIdentifier interface {
	Identify(context.Context, Evidence) Identity
}

type BasicVINDecoder struct{}

type VPICVINDecoder struct {
	Client  *http.Client
	BaseURL string
}

var vinPattern = regexp.MustCompile(`^[A-HJ-NPR-Z0-9]{17}$`)

func ValidateVIN(vin string) error {
	if !vinPattern.MatchString(strings.ToUpper(strings.TrimSpace(vin))) {
		return errors.New("VIN must be 17 characters and may not contain I, O, or Q")
	}
	return nil
}

func (BasicVINDecoder) Decode(_ context.Context, raw string) (DecodedVIN, error) {
	vin := strings.ToUpper(strings.TrimSpace(raw))
	if err := ValidateVIN(vin); err != nil {
		return DecodedVIN{}, err
	}
	wmi := vin[:3]
	manufacturers := map[string]string{"JHM": "Honda", "SHH": "Honda", "1HG": "Honda", "2HG": "Honda", "19X": "Honda", "3CZ": "Honda", "1FM": "Ford", "1FA": "Ford", "3FA": "Ford", "1V2": "Volkswagen"}
	yearCodes := "ABCDEFGHJKLMNPRSTVWXY123456789"
	year := 0
	if index := strings.IndexByte(yearCodes, vin[9]); index >= 0 {
		year = 1980 + index
		if year < 2010 {
			year += 30
		}
	}
	return DecodedVIN{VIN: vin, WMI: wmi, Manufacturer: manufacturers[wmi], ModelYear: year}, nil
}

func (d VPICVINDecoder) Decode(ctx context.Context, raw string) (DecodedVIN, error) {
	vin := strings.ToUpper(strings.TrimSpace(raw))
	if err := ValidateVIN(vin); err != nil {
		return DecodedVIN{}, err
	}
	baseURL := strings.TrimRight(d.BaseURL, "/")
	if baseURL == "" {
		baseURL = "https://vpic.nhtsa.dot.gov/api/vehicles"
	}
	client := d.Client
	if client == nil {
		client = &http.Client{Timeout: 4 * time.Second}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/DecodeVinValuesExtended/"+url.PathEscape(vin)+"?format=json", nil)
	if err != nil {
		return DecodedVIN{}, err
	}
	response, err := client.Do(req)
	if err != nil {
		return DecodedVIN{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return DecodedVIN{}, fmt.Errorf("vPIC returned %s", response.Status)
	}
	var payload struct {
		Results []struct {
			VIN, Manufacturer, Make, Model, ModelYear, Trim, Series, EngineModel, ErrorCode string
		} `json:"Results"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return DecodedVIN{}, err
	}
	if len(payload.Results) == 0 {
		return DecodedVIN{}, errors.New("vPIC returned no VIN result")
	}
	result := payload.Results[0]
	if result.Make == "" && result.Manufacturer == "" {
		return DecodedVIN{}, fmt.Errorf("vPIC could not decode VIN (error code %s)", result.ErrorCode)
	}
	trim := result.Trim
	if trim == "" {
		trim = result.Series
	}
	var year int
	_, _ = fmt.Sscan(result.ModelYear, &year)
	return DecodedVIN{VIN: vin, WMI: vin[:3], Manufacturer: result.Manufacturer, Make: result.Make, Model: result.Model, Trim: trim, Engine: result.EngineModel, ModelYear: year}, nil
}

type BasicIdentifier struct{ Decoder VINDecoder }

func (b BasicIdentifier) Identify(ctx context.Context, e Evidence) Identity {
	unknown := func() Field { return Field{Value: "UNKNOWN", Source: "unavailable"} }
	out := Identity{VIN: unknown(), Manufacturer: unknown(), Make: unknown(), Model: unknown(), Generation: unknown(), Trim: unknown(), ModelYear: unknown(), Engine: unknown()}
	if b.Decoder == nil {
		b.Decoder = BasicVINDecoder{}
	}
	if decoded, err := b.Decoder.Decode(ctx, e.VIN); err == nil {
		out.VIN = Field{Value: decoded.VIN, Confidence: 1, Source: "obd2-mode09"}
		if decoded.Manufacturer != "" {
			out.Manufacturer = Field{Value: decoded.Manufacturer, Confidence: 1, Source: "vin-decoder"}
		}
		if decoded.Make != "" {
			out.Make = Field{Value: decoded.Make, Confidence: 1, Source: "vin-decoder"}
		} else if decoded.Manufacturer != "" {
			out.Make = out.Manufacturer
		}
		if decoded.Model != "" {
			out.Model = Field{Value: decoded.Model, Confidence: .95, Source: "vin-decoder"}
		}
		if decoded.Trim != "" {
			out.Trim = Field{Value: decoded.Trim, Confidence: .9, Source: "vin-decoder"}
		}
		if decoded.Engine != "" {
			out.Engine = Field{Value: decoded.Engine, Confidence: .9, Source: "vin-decoder"}
		}
		if decoded.ModelYear != 0 {
			out.ModelYear = Field{Value: fmt.Sprint(decoded.ModelYear), Confidence: .9, Source: "vin-year-code"}
		}
		out.Sources = append(out.Sources, "vin")
	}
	applyHint := func(target *Field, value, source string, confidence float64) {
		if value != "" {
			*target = Field{Value: value, Confidence: confidence, Source: source}
		}
	}
	applyHint(&out.Manufacturer, e.ManufacturerHint, "configured-hint", .85)
	applyHint(&out.Make, e.ManufacturerHint, "configured-hint", .85)
	applyHint(&out.Model, e.ModelHint, "configured-hint", .85)
	applyHint(&out.Generation, e.GenerationHint, "configured-hint", .9)
	applyHint(&out.Trim, e.TrimHint, "configured-hint", .8)
	if e.ModelYearHint != 0 {
		applyHint(&out.ModelYear, fmt.Sprint(e.ModelYearHint), "configured-hint", .85)
	}
	out.Confidence = averageKnown(out.Manufacturer, out.Model, out.Generation, out.ModelYear)
	return out
}

func averageKnown(fields ...Field) float64 {
	var total float64
	var count int
	for _, field := range fields {
		if field.Value != "UNKNOWN" {
			total += field.Confidence
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return total / float64(count)
}

type ProfileMatch struct {
	ProfileID  string     `json:"profileId"`
	OSName     string     `json:"osName"`
	Score      float64    `json:"score"`
	Confidence Confidence `json:"confidence"`
	Evidence   []string   `json:"evidence"`
}

func MatchProfile(identity Identity) ProfileMatch {
	value := func(field Field) string { return strings.ToLower(field.Value) }
	manufacturer, model, generation := value(identity.Manufacturer), value(identity.Model), value(identity.Generation)
	candidates := []struct{ id, os, make, model, generation string }{
		{"fk8", "FK8 OS", "honda", "civic type r", "fk8"},
		{"fl5", "FL5 OS", "honda", "civic type r", "fl5"},
		{"bronco", "BRONCO OS", "ford", "bronco", "bronco"},
	}
	best := ProfileMatch{ProfileID: "generic", OSName: "MIRAGE VEHICLE OS", Confidence: ConfidenceLow}
	for _, candidate := range candidates {
		score := 0.0
		evidence := []string{}
		if manufacturer == candidate.make {
			score += .3
			evidence = append(evidence, identity.Manufacturer.Value)
		}
		if model == candidate.model {
			score += .3
			evidence = append(evidence, identity.Model.Value)
		}
		if generation == candidate.generation {
			score += .4
			evidence = append(evidence, strings.ToUpper(candidate.generation))
		}
		if score > best.Score && score >= .7 {
			best = ProfileMatch{ProfileID: candidate.id, OSName: candidate.os, Score: score, Confidence: ConfidenceHigh, Evidence: evidence}
		}
	}
	if best.ProfileID == "generic" && model != "" && model != "unknown" {
		modelName := strings.ToUpper(identity.Model.Value)
		profileID := strings.Trim(strings.ToLower(regexp.MustCompile(`[^a-zA-Z0-9]+`).ReplaceAllString(identity.Model.Value, "-")), "-")
		best = ProfileMatch{ProfileID: profileID, OSName: modelName + " OS", Score: .6, Confidence: ConfidenceMedium, Evidence: []string{identity.Make.Value, identity.Model.Value}}
	}
	return best
}
