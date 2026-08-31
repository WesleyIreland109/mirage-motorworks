package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable data class MetricSummary(val key: String, val label: String, val unit: String, val samples: Long, val min: Double, val average: Double, val max: Double)
@Serializable data class SessionImport(val vehicleId: String, val externalSessionId: String, val label: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>, val recordedMileage: Int? = null)
@Serializable data class TelemetrySession(val id: String, val vehicleId: String, val externalSessionId: String, val label: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>, val importedAt: String, val recordedMileage: Int? = null)
@Serializable data class TelemetrySessionUpdate(val label: String)
@Serializable data class TelemetryVehicleIdentity(val year: Int? = null, val make: String? = null, val model: String? = null, val trim: String? = null, val vin: String? = null, val profileId: String? = null)
@Serializable data class TelemetryIntakeImport(val externalSessionId: String, val label: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>, val recordedMileage: Int? = null, val detectedVehicle: TelemetryVehicleIdentity = TelemetryVehicleIdentity())
@Serializable data class TelemetryIntakeSession(val id: String, val externalSessionId: String, val label: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>, val recordedMileage: Int? = null, val detectedVehicle: TelemetryVehicleIdentity = TelemetryVehicleIdentity(), val status: String = "unassigned", val assignedVehicleId: String? = null, val createdAt: String, val updatedAt: String)
@Serializable data class BulkTelemetryImportRequest(val sessions: List<TelemetryIntakeImport>)
@Serializable data class BulkTelemetryImportResult(val imported: List<TelemetrySession> = emptyList(), val queued: List<TelemetryIntakeSession> = emptyList(), val skipped: List<String> = emptyList())
@Serializable data class IntakeAssignRequest(val vehicleId: String)
@Serializable data class ReportDraft(val title: String, val overview: String, val observations: List<String>)
@Serializable data class MetricAssessment(val key: String, val referenceLow: Double, val referenceHigh: Double, val status: String, val description: String, val referenceType: String = "generic_guidance")
@Serializable data class PublishReportRequest(val visibility: String = "private", val viewerUserId: String? = null)
@Serializable data class DriveReport(val id: String, val sessionId: String, val publicToken: String, val title: String, val overview: String, val observations: List<String>, val status: String, val publishedAt: String? = null, val vehicleLabel: String = "", val sessionLabel: String = "", val startedAt: String = "", val source: String = "unknown", val metrics: List<MetricSummary> = emptyList(), val assessments: List<MetricAssessment> = emptyList(), val visibility: String = "private", val viewerUserId: String? = null)
@Serializable data class MirageAIVehicleDraft(val year: Int? = null, val make: String? = null, val model: String? = null, val trim: String? = null, val vin: String? = null, val mileage: Int? = null, val profileId: String? = null)
@Serializable data class MirageAIRequest(val vehicle: MirageAIVehicleDraft, val sessionLabel: String, val startedAt: String, val durationMs: Long, val samples: Long, val obdRequests: Long, val obdErrors: Long, val source: String, val metrics: List<MetricSummary>, val assessments: List<MetricAssessment> = emptyList())
@Serializable data class MirageAIResponse(val title: String, val overview: String, val observations: List<String>, val suggestions: List<String> = emptyList(), val vehicle: MirageAIVehicleDraft = MirageAIVehicleDraft())
