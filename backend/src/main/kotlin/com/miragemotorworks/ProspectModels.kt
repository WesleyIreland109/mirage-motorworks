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
    val auctionStatus: String = "unknown",
    val auctionEndsAt: String? = null,
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
    val auctionStatus: String = "unknown",
    val auctionEndsAt: String? = null,
    val checklist: List<ProspectChecklistItem>,
    val obd: ProspectObdSnapshot,
    val estimatedRepairCents: Long? = null,
    val recommendedOfferCents: Long? = null,
    val valueNotes: String,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class ProspectAIRequest(
    val prospect: ProspectReportInput,
    val listingText: String = ""
)

@Serializable
data class ProspectAIResponse(
    val vehicleLabel: String? = null,
    val askingPriceCents: Long? = null,
    val mileage: Int? = null,
    val location: String? = null,
    val sellerName: String? = null,
    val vin: String? = null,
    val status: String = "researching",
    val summary: String = "",
    val auctionStatus: String = "unknown",
    val auctionEndsAt: String? = null,
    val estimatedRepairCents: Long? = null,
    val recommendedOfferCents: Long? = null,
    val valueNotes: String = "",
    val confidence: String = "low",
    val sourceNotes: List<String> = emptyList()
)
