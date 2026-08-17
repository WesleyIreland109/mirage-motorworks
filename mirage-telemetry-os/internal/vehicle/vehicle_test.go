package vehicle

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVINValidationAndBasicDecode(t *testing.T) {
	decoder := BasicVINDecoder{}
	decoded, err := decoder.Decode(context.Background(), "SHHFK8730MU000001")
	if err != nil {
		t.Fatal(err)
	}
	if decoded.Manufacturer != "Honda" || decoded.ModelYear != 2021 {
		t.Fatalf("decoded=%+v", decoded)
	}
	if _, err = decoder.Decode(context.Background(), "MALFORMED"); err == nil {
		t.Fatal("expected malformed VIN error")
	}
}

func TestVPICVINDecoder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Results":[{"VIN":"3CZRZ2H50TM000001","Manufacturer":"Honda de Mexico","Make":"HONDA","Model":"HR-V","ModelYear":"2026","Trim":"Sport","EngineModel":"L15B"}]}`))
	}))
	defer server.Close()
	decoded, err := (VPICVINDecoder{BaseURL: server.URL}).Decode(context.Background(), "3CZRZ2H50TM000001")
	if err != nil {
		t.Fatal(err)
	}
	if decoded.Make != "HONDA" || decoded.Model != "HR-V" || decoded.ModelYear != 2026 {
		t.Fatalf("decoded=%+v", decoded)
	}
}

func TestProfileMatchingRequiresSpecificEvidence(t *testing.T) {
	generic := MatchProfile(Identity{Manufacturer: Field{Value: "Honda", Confidence: 1}})
	if generic.ProfileID != "generic" {
		t.Fatalf("unknown Honda matched %s", generic.ProfileID)
	}
	fk8 := MatchProfile(Identity{Manufacturer: Field{Value: "Honda"}, Model: Field{Value: "Civic Type R"}, Generation: Field{Value: "FK8"}})
	if fk8.ProfileID != "fk8" || fk8.Score < .9 {
		t.Fatalf("match=%+v", fk8)
	}
	hrv := MatchProfile(Identity{Make: Field{Value: "HONDA"}, Model: Field{Value: "HR-V"}})
	if hrv.ProfileID != "hr-v" || hrv.OSName != "HR-V OS" || hrv.Confidence != ConfidenceMedium {
		t.Fatalf("dynamic match=%+v", hrv)
	}
}
