package vehicle

import (
	"context"
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
func TestProfileMatchingRequiresSpecificEvidence(t *testing.T) {
	generic := MatchProfile(Identity{Manufacturer: Field{Value: "Honda", Confidence: 1}})
	if generic.ProfileID != "generic" {
		t.Fatalf("unknown Honda matched %s", generic.ProfileID)
	}
	fk8 := MatchProfile(Identity{Manufacturer: Field{Value: "Honda"}, Model: Field{Value: "Civic Type R"}, Generation: Field{Value: "FK8"}})
	if fk8.ProfileID != "fk8" || fk8.Score < .9 {
		t.Fatalf("match=%+v", fk8)
	}
}
