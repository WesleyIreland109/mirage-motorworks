package vehicle

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var ErrVINNotCached = errors.New("VIN is not available in the local decoder cache")

// CacheDecoder persists successful VIN results for offline use. The file may
// contain full VINs and must remain private; it is created with mode 0600.
type CacheDecoder struct {
	Path     string
	Fallback VINDecoder
	mu       sync.Mutex
}

type vinCacheFile struct {
	Version int                   `json:"version"`
	Entries map[string]DecodedVIN `json:"entries"`
}

func (d *CacheDecoder) Decode(ctx context.Context, raw string) (DecodedVIN, error) {
	vin := strings.ToUpper(strings.TrimSpace(raw))
	if err := ValidateVIN(vin); err != nil {
		return DecodedVIN{}, err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	cache, err := d.load()
	if err != nil {
		return DecodedVIN{}, err
	}
	if decoded, ok := cache.Entries[vin]; ok {
		return decoded, nil
	}
	if d.Fallback == nil {
		return DecodedVIN{}, ErrVINNotCached
	}
	decoded, err := d.Fallback.Decode(ctx, vin)
	if err != nil {
		return DecodedVIN{}, err
	}
	cache.Entries[vin] = decoded
	if err := d.save(cache); err != nil {
		return DecodedVIN{}, fmt.Errorf("save VIN cache: %w", err)
	}
	return decoded, nil
}

func (d *CacheDecoder) Status() (int, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	cache, err := d.load()
	return len(cache.Entries), err
}

func (d *CacheDecoder) load() (vinCacheFile, error) {
	cache := vinCacheFile{Version: 1, Entries: map[string]DecodedVIN{}}
	data, err := os.ReadFile(d.Path)
	if errors.Is(err, os.ErrNotExist) {
		return cache, nil
	}
	if err != nil {
		return cache, err
	}
	if err := json.Unmarshal(data, &cache); err != nil {
		return cache, fmt.Errorf("decode %s: %w", d.Path, err)
	}
	if cache.Entries == nil {
		cache.Entries = map[string]DecodedVIN{}
	}
	return cache, nil
}

func (d *CacheDecoder) save(cache vinCacheFile) error {
	if err := os.MkdirAll(filepath.Dir(d.Path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cache, "", "  ")
	if err != nil {
		return err
	}
	temporary := d.Path + ".tmp"
	if err := os.WriteFile(temporary, append(data, '\n'), 0o600); err != nil {
		return err
	}
	if err := os.Chmod(temporary, 0o600); err != nil {
		return err
	}
	return os.Rename(temporary, d.Path)
}
