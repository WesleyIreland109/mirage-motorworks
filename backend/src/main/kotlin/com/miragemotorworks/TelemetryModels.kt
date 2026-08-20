package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable data class MetricSummary(val key: String, val label: String, val unit: String, val samples: Long, val min: Double, val average: Double, val max: Double)
@Serializable data class SessionImport(val vehicleId: String, val externalSessionId: String, val label: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>, val recordedMileage: Int? = null)
@Serializable data class TelemetrySession(val id: String, val vehicleId: String, val externalSessionId: String, val label: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>, val importedAt: String, val recordedMileage: Int? = null)
@Serializable data class ReportDraft(val title: String, val overview: String, val observations: List<String>)
@Serializable data class DriveReport(val id: String, val sessionId: String, val publicToken: String, val title: String, val overview: String, val observations: List<String>, val status: String, val publishedAt: String? = null, val vehicleLabel: String = "", val sessionLabel: String = "", val startedAt: String = "", val source: String = "unknown", val metrics: List<MetricSummary> = emptyList())
@Serializable data class MirageAIVehicleDraft(val year: Int? = null, val make: String? = null, val model: String? = null, val trim: String? = null, val vin: String? = null, val mileage: Int? = null, val profileId: String? = null)
@Serializable data class MirageAIRequest(val vehicle: MirageAIVehicleDraft, val sessionLabel: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>)
@Serializable data class MirageAIResponse(val title: String, val overview: String, val observations: List<String>, val suggestions: List<String> = emptyList(), val vehicle: MirageAIVehicleDraft = MirageAIVehicleDraft())
