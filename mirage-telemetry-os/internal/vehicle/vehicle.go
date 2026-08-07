package vehicle

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
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
	ModelYearHint                                                        int
	SupportedPIDs                                                        map[string]bool
}

type DecodedVIN struct {
	VIN, WMI, Manufacturer string
	ModelYear              int
}

type VINDecoder interface {
	Decode(context.Context, string) (DecodedVIN, error)
}

type VehicleIdentifier interface {
	Identify(context.Context, Evidence) Identity
}

type BasicVINDecoder struct{}

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
	manufacturers := map[string]string{"JHM": "Honda", "SHH": "Honda", "1HG": "Honda", "2HG": "Honda", "19X": "Honda", "1FM": "Ford", "1FA": "Ford", "3FA": "Ford"}
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
			out.Manufacturer = Field{Value: decoded.Manufacturer, Confidence: 1, Source: "vin-wmi"}
			out.Make = out.Manufacturer
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
	return best
}
