package com.miragemotorworks

object MetricReferences {
    private data class Range(val low: Double, val high: Double, val description: String)
    private val ranges = mapOf(
        "battery_voltage" to Range(11.8, 15.2, "Broad control-module voltage guidance; charging strategy varies by vehicle."),
        "coolant_temp_f" to Range(160.0, 235.0, "Broad warmed-engine coolant guidance; cold-start samples may fall below it."),
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
