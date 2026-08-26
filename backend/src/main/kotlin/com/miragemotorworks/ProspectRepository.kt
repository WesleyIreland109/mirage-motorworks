package com.miragemotorworks

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.sql.ResultSet
import java.util.UUID

class ProspectRepository(private val database: Database) {
    private val json = Json { ignoreUnknownKeys = true }
    private val allowedStatuses = setOf("new", "researching", "inspecting", "review", "offer_candidate", "declined", "purchased")
    private val allowedResults = setOf("pass", "monitor", "fail", "unknown", "not_applicable")
    private val allowedObdStates = setOf("clear", "codes_present", "not_scanned", "unknown")
    private val allowedMonitorStates = setOf("ready", "not_ready", "mixed", "unknown")

    fun list(): List<ProspectReport> = database.withConnection { connection ->
        connection.prepareStatement("SELECT * FROM prospect_reports ORDER BY updated_at DESC").use { statement ->
            statement.executeQuery().use { result -> buildList { while (result.next()) add(result.toProspectReport()) } }
        }
    }

    fun create(userId: String, input: ProspectReportInput): ProspectReport {
        validate(input)
        return database.withConnection { connection ->
            val id = UUID.randomUUID()
            connection.prepareStatement(
                """INSERT INTO prospect_reports (
                    id, created_by_user_id, listing_url, vehicle_label, asking_price_cents, mileage,
                    location, seller_name, vin, status, summary, checklist_json, obd_json,
                    estimated_repair_cents, recommended_offer_cents, value_notes
                ) VALUES (?, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?)
                RETURNING *"""
            ).use { statement ->
                bindInput(statement, input)
                statement.setObject(1, id)
                statement.setString(2, userId)
                statement.executeQuery().use { result -> result.next(); result.toProspectReport() }
            }
        }
    }

    fun update(id: String, input: ProspectReportInput): ProspectReport? {
        validate(input)
        return database.withConnection { connection ->
            connection.prepareStatement(
                """UPDATE prospect_reports SET
                    listing_url = ?, vehicle_label = ?, asking_price_cents = ?, mileage = ?,
                    location = ?, seller_name = ?, vin = ?, status = ?, summary = ?,
                    checklist_json = ?::jsonb, obd_json = ?::jsonb, estimated_repair_cents = ?,
                    recommended_offer_cents = ?, value_notes = ?, updated_at = NOW()
                WHERE id = ?::uuid
                RETURNING *"""
            ).use { statement ->
                bindInput(statement, input, offset = 0)
                statement.setString(15, id)
                statement.executeQuery().use { result -> if (result.next()) result.toProspectReport() else null }
            }
        }
    }

    fun delete(id: String): Boolean = database.withConnection { connection ->
        connection.prepareStatement("DELETE FROM prospect_reports WHERE id = ?::uuid").use { statement ->
            statement.setString(1, id)
            statement.executeUpdate() > 0
        }
    }

    private fun validate(input: ProspectReportInput) {
        require(input.listingUrl.trim().length in 8..2000)
        require(input.vehicleLabel.trim().length in 2..180)
        require(input.status in allowedStatuses)
        require(input.mileage == null || input.mileage >= 0)
        require(input.askingPriceCents == null || input.askingPriceCents >= 0)
        require(input.estimatedRepairCents == null || input.estimatedRepairCents >= 0)
        require(input.recommendedOfferCents == null || input.recommendedOfferCents >= 0)
        require(input.checklist.size <= 80)
        input.checklist.forEach {
            require(it.category.trim().length in 1..80)
            require(it.label.trim().length in 1..220)
            require(it.result in allowedResults)
            require(it.notes.length <= 1000)
        }
        require(input.obd.codesPresent in allowedObdStates)
        require(input.obd.monitorsReady in allowedMonitorStates)
    }

    private fun bindInput(statement: java.sql.PreparedStatement, input: ProspectReportInput, offset: Int = 2) {
        statement.setString(offset + 1, input.listingUrl.trim())
        statement.setString(offset + 2, input.vehicleLabel.trim())
        if (input.askingPriceCents == null) statement.setNull(offset + 3, java.sql.Types.BIGINT) else statement.setLong(offset + 3, input.askingPriceCents)
        if (input.mileage == null) statement.setNull(offset + 4, java.sql.Types.INTEGER) else statement.setInt(offset + 4, input.mileage)
        statement.setString(offset + 5, input.location.trim())
        statement.setString(offset + 6, input.sellerName.trim())
        statement.setString(offset + 7, input.vin?.trim()?.ifEmpty { null })
        statement.setString(offset + 8, input.status)
        statement.setString(offset + 9, input.summary.trim())
        statement.setString(offset + 10, json.encodeToString(input.checklist.map {
            it.copy(category = it.category.trim(), label = it.label.trim(), notes = it.notes.trim())
        }))
        statement.setString(offset + 11, json.encodeToString(input.obd))
        if (input.estimatedRepairCents == null) statement.setNull(offset + 12, java.sql.Types.BIGINT) else statement.setLong(offset + 12, input.estimatedRepairCents)
        if (input.recommendedOfferCents == null) statement.setNull(offset + 13, java.sql.Types.BIGINT) else statement.setLong(offset + 13, input.recommendedOfferCents)
        statement.setString(offset + 14, input.valueNotes.trim())
    }

    private fun ResultSet.toProspectReport() = ProspectReport(
        id = getString("id"),
        createdByUserId = getString("created_by_user_id"),
        listingUrl = getString("listing_url"),
        vehicleLabel = getString("vehicle_label"),
        askingPriceCents = (getObject("asking_price_cents") as? Number)?.toLong(),
        mileage = (getObject("mileage") as? Number)?.toInt(),
        location = getString("location"),
        sellerName = getString("seller_name"),
        vin = getString("vin"),
        status = getString("status"),
        summary = getString("summary"),
        checklist = json.decodeFromString(getString("checklist_json")),
        obd = json.decodeFromString(getString("obd_json")),
        estimatedRepairCents = (getObject("estimated_repair_cents") as? Number)?.toLong(),
        recommendedOfferCents = (getObject("recommended_offer_cents") as? Number)?.toLong(),
        valueNotes = getString("value_notes"),
        createdAt = getString("created_at"),
        updatedAt = getString("updated_at")
    )
}
