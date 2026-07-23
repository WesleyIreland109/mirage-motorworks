package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable
data class Vehicle(
    val id: String,
    val slug: String,
    val year: Int,
    val make: String,
    val model: String,
    val trim: String,
    val status: String,
    val mileage: Int,
    val exteriorColor: String,
    val interiorColor: String,
    val transmission: String,
    val drivetrain: String,
    val engine: String,
    val askingPrice: Double,
    val investedAmount: Double,
    val projectedProfit: Double,
    val daysInInventory: Int,
    val heroImage: String,
    val gallery: List<String>,
    val highlights: List<String>,
    val story: String,
    val inspectionNotes: String,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class VehicleInput(
    val slug: String,
    val year: Int,
    val make: String,
    val model: String,
    val trim: String,
    val status: String,
    val mileage: Int,
    val exteriorColor: String,
    val interiorColor: String,
    val transmission: String,
    val drivetrain: String,
    val engine: String,
    val askingPrice: Double,
    val investedAmount: Double,
    val projectedProfit: Double,
    val daysInInventory: Int,
    val heroImage: String,
    val gallery: List<String>,
    val highlights: List<String>,
    val story: String,
    val inspectionNotes: String
)
