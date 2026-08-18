# Offline VIN decoding

Mirage uses three VIN layers in order:

1. A private local JSON cache for vehicles already decoded.
2. NHTSA's official standalone PostgreSQL vPIC database when configured.
3. The NHTSA vPIC HTTPS API only when `VIN_LOOKUP_MODE=cache-first` and local data misses.

Set `VIN_LOOKUP_MODE=offline` to prohibit the HTTPS fallback. Basic WMI and model-year decoding remains available even when neither detailed local source resolves a VIN.

## Cache a vehicle once

```bash
bin/mirage --online vin decode VIN_HERE
bin/mirage vin decode VIN_HERE
bin/mirage vin cache-status
```

The second decode is entirely offline. `data/vin-cache.json` contains full VINs, is permission-restricted, and is ignored by Git.

## Install the complete NHTSA decoder

NHTSA publishes PostgreSQL 17 backups specifically for offline VIN decoding. Create a private local `vpic` database, set its connection URL, then run:

```bash
export VPIC_DATABASE_URL='postgresql:///vpic?host=/var/run/postgresql'
make vpic-update
```

The update downloads the selected official release, restores schema `vpic`, and removes the temporary archive. Override `VPIC_RELEASE` when NHTSA publishes a newer monthly file. Mirage calls the documented `vpic.spVinDecode` function and caches successful results, so PostgreSQL does not need to be queried repeatedly for a known vehicle.

The standalone database is large after restoration. For the first Pi image, keep it on the SD card and measure memory/storage use. A later build pipeline can transform the official release into a smaller signed appliance database without changing the `VINDecoder` interface.
