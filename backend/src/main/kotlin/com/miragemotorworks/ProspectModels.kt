package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable
data class ProspectChecklistItem(
    val category: String,
    val label: String,
    val result: String = "unknown",
    val notes: String = ""
)

@Serializable
data class ProspectObdSnapshot(
    val scannerUsed: Boolean = false,
    val scannerModel: String = "",
    val codesPresent: String = "unknown",
    val codeSummary: String = "",
    val monitorsReady: String = "unknown",
    val freezeFrameNotes: String = "",
    val liveDataNotes: String = ""
)

@Serializable
data class ProspectReportInput(
    val listingUrl: String,
    val vehicleLabel: String,
    val askingPriceCents: Long? = null,
    val mileage: Int? = null,
    val location: String = "",
    val sellerName: String = "",
    val vin: String? = null,
    val status: String = "new",
    val summary: String = "",
    val checklist: List<ProspectChecklistItem> = emptyList(),
    val obd: ProspectObdSnapshot = ProspectObdSnapshot(),
    val estimatedRepairCents: Long? = null,
    val recommendedOfferCents: Long? = null,
    val valueNotes: String = ""
)

@Serializable
data class ProspectReport(
    val id: String,
    val createdByUserId: String,
    val listingUrl: String,
    val vehicleLabel: String,
    val askingPriceCents: Long? = null,
    val mileage: Int? = null,
    val location: String,
    val sellerName: String,
    val vin: String? = null,
    val status: String,
    val summary: String,
    val checklist: List<ProspectChecklistItem>,
    val obd: ProspectObdSnapshot,
    val estimatedRepairCents: Long? = null,
    val recommendedOfferCents: Long? = null,
    val valueNotes: String,
    val createdAt: String,
    val updatedAt: String
)
