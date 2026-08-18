package vehicle

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

type fixedDecoder struct {
	decoded DecodedVIN
	calls   int
}

func (d *fixedDecoder) Decode(context.Context, string) (DecodedVIN, error) {
	d.calls++
	return d.decoded, nil
}

func TestCacheDecoderUsesPersistedResultOffline(t *testing.T) {
	path := filepath.Join(t.TempDir(), "vin-cache.json")
	vin := "3CZRZ2H50TM000001"
	fallback := &fixedDecoder{decoded: DecodedVIN{VIN: vin, Make: "HONDA", Model: "HR-V", ModelYear: 2026}}
	first := &CacheDecoder{Path: path, Fallback: fallback}
	if _, err := first.Decode(context.Background(), vin); err != nil {
		t.Fatal(err)
	}
	offline := &CacheDecoder{Path: path}
	decoded, err := offline.Decode(context.Background(), vin)
	if err != nil || decoded.Model != "HR-V" || fallback.calls != 1 {
		t.Fatalf("decoded=%+v calls=%d err=%v", decoded, fallback.calls, err)
	}
	if _, err = offline.Decode(context.Background(), "1V2AA2CA0JC000001"); !errors.Is(err, ErrVINNotCached) {
		t.Fatalf("expected cache miss, got %v", err)
	}
}
