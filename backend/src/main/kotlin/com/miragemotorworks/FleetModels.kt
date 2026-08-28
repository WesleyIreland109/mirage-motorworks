package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable
data class MaintenanceAnswer(val category: String, val label: String, val condition: String)

@Serializable
data class FleetVehicleInput(
    val year: Int,
    val make: String,
    val model: String,
    val nickname: String = "",
    val trim: String = "",
    val mileage: Int,
    val vin: String? = null,
    val primaryUse: String,
    val annualMileage: Int? = null,
    val notes: String = "",
    val purpose: String = "personal",
    val ownerName: String? = null,
    val acquisitionPriceCents: Long? = null,
    val targetSalePriceCents: Long? = null,
    val answers: List<MaintenanceAnswer>,
    val customItems: List<String> = emptyList()
)

@Serializable
data class FleetVehicleUpdate(
    val year: Int,
    val make: String,
    val model: String,
    val nickname: String = "",
    val trim: String = "",
    val mileage: Int,
    val vin: String? = null,
    val primaryUse: String,
    val annualMileage: Int? = null,
    val notes: String = "",
    val purpose: String = "personal",
    val ownerName: String? = null,
    val acquisitionPriceCents: Long? = null,
    val targetSalePriceCents: Long? = null
)

@Serializable
data class MaintenanceTask(
    val id: String,
    val title: String,
    val category: String,
    val priority: String,
    val penalty: Int,
    val status: String,
    val source: String,
    val notes: String
)

@Serializable
data class FleetVehicleShare(
    val id: String,
    val userId: String,
    val email: String,
    val displayName: String,
    val permission: String,
    val createdAt: String
)

@Serializable
data class FleetVehicle(
    val id: String,
    val year: Int,
    val make: String,
    val model: String,
    val nickname: String = "",
    val trim: String,
    val mileage: Int,
    val vin: String?,
    val primaryUse: String,
    val annualMileage: Int?,
    val notes: String,
    val purpose: String,
    val ownerName: String?,
    val acquisitionPriceCents: Long?,
    val targetSalePriceCents: Long?,
    val readiness: Int,
    val tasks: List<MaintenanceTask>,
    val accessRole: String = "owner",
    val shares: List<FleetVehicleShare> = emptyList()
)

@Serializable
data class TaskUpdate(val status: String, val notes: String? = null, val completedMileage: Int? = null)

@Serializable
data class FleetShareRequest(val userId: String, val permission: String = "editor")
