package vehicle

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// PostgresVINDecoder uses NHTSA's official standalone vPIC PostgreSQL database.
// It performs no network request to NHTSA and supports the published
// vpic.spVinDecode function.
type PostgresVINDecoder struct{ DSN string }

func (d PostgresVINDecoder) Decode(ctx context.Context, raw string) (DecodedVIN, error) {
	vin := strings.ToUpper(strings.TrimSpace(raw))
	if err := ValidateVIN(vin); err != nil {
		return DecodedVIN{}, err
	}
	if d.DSN == "" {
		return DecodedVIN{}, errors.New("vPIC database URL is not configured")
	}
	database, err := sql.Open("pgx", d.DSN)
	if err != nil {
		return DecodedVIN{}, err
	}
	defer database.Close()
	rows, err := database.QueryContext(ctx, `SELECT variable, value FROM vpic.spVinDecode($1) WHERE value IS NOT NULL AND value <> ''`, vin)
	if err != nil {
		return DecodedVIN{}, fmt.Errorf("local vPIC decode: %w", err)
	}
	defer rows.Close()
	decoded := DecodedVIN{VIN: vin, WMI: vin[:3]}
	for rows.Next() {
		var variable, value string
		if err := rows.Scan(&variable, &value); err != nil {
			return DecodedVIN{}, err
		}
		switch strings.ToLower(variable) {
		case "manufacturer name":
			decoded.Manufacturer = value
		case "make":
			decoded.Make = value
		case "model":
			decoded.Model = value
		case "model year":
			decoded.ModelYear, _ = strconv.Atoi(value)
		case "trim", "series":
			if decoded.Trim == "" {
				decoded.Trim = value
			}
		case "engine model":
			decoded.Engine = value
		}
	}
	if err := rows.Err(); err != nil {
		return DecodedVIN{}, err
	}
	if decoded.Make == "" && decoded.Manufacturer == "" {
		return DecodedVIN{}, errors.New("local vPIC database returned no vehicle identity")
	}
	return decoded, nil
}

type ChainDecoder []VINDecoder

func (d ChainDecoder) Decode(ctx context.Context, vin string) (DecodedVIN, error) {
	var failures []string
	for _, decoder := range d {
		if decoder == nil {
			continue
		}
		decoded, err := decoder.Decode(ctx, vin)
		if err == nil {
			return decoded, nil
		}
		failures = append(failures, err.Error())
	}
	if len(failures) == 0 {
		return DecodedVIN{}, ErrVINNotCached
	}
	return DecodedVIN{}, errors.New(strings.Join(failures, "; "))
}
