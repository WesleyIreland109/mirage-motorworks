package com.miragemotorworks

object MetricReferences {
    private data class Range(val low: Double, val high: Double, val description: String)
    private val ranges = mapOf(
        "battery_voltage" to Range(11.8, 15.2, "Broad control-module voltage guidance; charging strategy varies by vehicle."),
        "coolant_temp_f" to Range(160.0, 235.0, "Broad warmed-engine coolant guidance; cold-start samples may fall below it."),
        "oil_temp_f" to Range(140.0, 280.0, "Broad oil-temperature guidance; oil warmup, engine design, and driving load matter."),
        "rpm" to Range(500.0, 7200.0, "Broad engine-speed plausibility guidance. Idle quality and redline vary by engine and tune."),
        "boost_psi" to Range(-15.0, 25.0, "Broad manifold pressure or boost/vacuum plausibility guidance; expected boost is vehicle and tune specific."),
        "afr" to Range(10.0, 16.5, "Broad gasoline air/fuel ratio plausibility guidance; load, warmup, closed-loop status, and sensor type matter."),
        "lambda" to Range(0.70, 1.25, "Broad oxygen-sensor lambda plausibility guidance; 1.00 is stoichiometric for the fuel being used."),
        "fuel_pressure_psi" to Range(30.0, 90.0, "Broad low-side fuel-pressure plausibility guidance. Direct-injection rail pressure is a different measurement."),
        "intake_air_temp_f" to Range(-40.0, 180.0, "Sensor plausibility envelope, not a vehicle-health target."),
        "throttle_percent" to Range(0.0, 100.0, "Standardized PID bounds; driving demand determines the expected value."),
        "engine_load_percent" to Range(0.0, 100.0, "Standardized PID bounds; driving demand determines the expected value.")
    )

    fun assess(metrics: List<MetricSummary>): List<MetricAssessment> = metrics.mapNotNull { metric ->
        val reference = ranges[metric.key] ?: return@mapNotNull null
        val status = when {
            metric.min >= reference.low && metric.max <= reference.high -> "within"
            metric.max < reference.low || metric.min > reference.high -> "outside"
            else -> "mixed"
        }
        MetricAssessment(metric.key, reference.low, reference.high, status, reference.description)
    }
}
