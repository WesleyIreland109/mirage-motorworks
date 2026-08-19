package com.miragemotorworks

import java.sql.Connection
import java.sql.ResultSet
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

class FleetRepository(private val database: Database) {
    fun list(userId: String): List<FleetVehicle> = database.withConnection { connection ->
        connection.prepareStatement("SELECT * FROM owned_vehicles WHERE user_id = ?::uuid ORDER BY created_at").use { statement ->
            statement.setString(1, userId)
            statement.executeQuery().use { result -> buildList { while (result.next()) add(result.toFleetVehicle(connection)) } }
        }
    }

    fun create(userId: String, input: FleetVehicleInput): FleetVehicle {
        require(input.year in 1950..2050 && input.make.isNotBlank() && input.model.isNotBlank() && input.mileage >= 0)
        require(input.purpose in setOf("personal", "working_on", "flip"))
        return database.withConnection { connection ->
            connection.autoCommit = false
            try {
                val id = UUID.randomUUID()
                connection.prepareStatement(
                    """INSERT INTO owned_vehicles
                    (id, user_id, year, make, model, trim, mileage, vin, primary_use, annual_mileage, notes,
                     purpose, owner_name, acquisition_price_cents, target_sale_price_cents)
                    VALUES (?, ?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
                ).use { statement ->
                    statement.setObject(1, id); statement.setString(2, userId); statement.setInt(3, input.year)
                    statement.setString(4, input.make.trim()); statement.setString(5, input.model.trim())
                    statement.setString(6, input.trim.trim()); statement.setInt(7, input.mileage)
                    statement.setString(8, input.vin?.trim()?.ifEmpty { null }); statement.setString(9, input.primaryUse)
                    if (input.annualMileage == null) statement.setNull(10, java.sql.Types.INTEGER) else statement.setInt(10, input.annualMileage)
                    statement.setString(11, input.notes.trim()); statement.setString(12, input.purpose)
                    statement.setString(13, input.ownerName?.trim()?.ifEmpty { null })
                    if (input.acquisitionPriceCents == null) statement.setNull(14, java.sql.Types.BIGINT) else statement.setLong(14, input.acquisitionPriceCents)
                    if (input.targetSalePriceCents == null) statement.setNull(15, java.sql.Types.BIGINT) else statement.setLong(15, input.targetSalePriceCents)
                    statement.executeUpdate()
                }
                input.answers.filter { it.condition != "good" }.forEach { answer ->
                    val (priority, penalty, action) = when (answer.condition) {
                        "needs_attention" -> Triple("important", 15, "Address")
                        "monitor" -> Triple("routine", 8, "Inspect")
                        else -> Triple("verify", 2, "Verify service history for")
                    }
                    insertTask(connection, id, "$action ${answer.label.lowercase()}", answer.category, priority, penalty, "questionnaire")
                }
                input.customItems.map(String::trim).filter(String::isNotEmpty).forEach {
                    insertTask(connection, id, it, "Owner observed", "routine", 8, "owner")
                }
                connection.commit()
                findOwned(connection, userId, id.toString())!!
            } catch (exception: Exception) {
                connection.rollback(); throw exception
            } finally { connection.autoCommit = true }
        }
    }

    fun updateTask(userId: String, taskId: String, update: TaskUpdate): FleetVehicle? {
        require(update.status in setOf("suggested", "accepted", "in_progress", "completed", "deferred"))
        return database.withConnection { connection ->
            connection.autoCommit = false
            try {
                val task = connection.prepareStatement(
                    """SELECT t.id, t.vehicle_id, t.title, v.mileage FROM maintenance_tasks t
                    JOIN owned_vehicles v ON v.id = t.vehicle_id WHERE t.id = ?::uuid AND v.user_id = ?::uuid"""
                ).use { statement ->
                    statement.setString(1, taskId); statement.setString(2, userId)
                    statement.executeQuery().use { result ->
                        if (!result.next()) null else arrayOf(result.getString("vehicle_id"), result.getString("title"), result.getString("mileage"))
                    }
                } ?: return@withConnection null
                connection.prepareStatement(
                    "UPDATE maintenance_tasks SET status = ?, notes = COALESCE(?, notes), completed_at = ?, completed_mileage = ?, updated_at = NOW() WHERE id = ?::uuid"
                ).use { statement ->
                    statement.setString(1, update.status); statement.setString(2, update.notes)
                    statement.setTimestamp(3, if (update.status == "completed") Timestamp.from(Instant.now()) else null)
                    val mileage = update.completedMileage ?: task[2].toInt()
                    if (update.status == "completed") statement.setInt(4, mileage) else statement.setNull(4, java.sql.Types.INTEGER)
                    statement.setString(5, taskId); statement.executeUpdate()
                }
                if (update.status == "completed") connection.prepareStatement(
                    "INSERT INTO service_records (id, vehicle_id, maintenance_task_id, title, mileage, notes) VALUES (?, ?::uuid, ?::uuid, ?, ?, ?)"
                ).use { statement ->
                    statement.setObject(1, UUID.randomUUID()); statement.setString(2, task[0]); statement.setString(3, taskId)
                    statement.setString(4, task[1]); statement.setInt(5, update.completedMileage ?: task[2].toInt())
                    statement.setString(6, update.notes ?: ""); statement.executeUpdate()
                }
                connection.commit(); findOwned(connection, userId, task[0])
            } catch (exception: Exception) { connection.rollback(); throw exception } finally { connection.autoCommit = true }
        }
    }

    private fun insertTask(connection: Connection, vehicleId: UUID, title: String, category: String, priority: String, penalty: Int, source: String) {
        connection.prepareStatement(
            "INSERT INTO maintenance_tasks (id, vehicle_id, title, category, priority, penalty, status, source) VALUES (?, ?, ?, ?, ?, ?, 'suggested', ?)"
        ).use { statement ->
            statement.setObject(1, UUID.randomUUID()); statement.setObject(2, vehicleId); statement.setString(3, title)
            statement.setString(4, category); statement.setString(5, priority); statement.setInt(6, penalty); statement.setString(7, source)
            statement.executeUpdate()
        }
    }

    private fun findOwned(connection: Connection, userId: String, id: String): FleetVehicle? = connection.prepareStatement(
        "SELECT * FROM owned_vehicles WHERE id = ?::uuid AND user_id = ?::uuid"
    ).use { statement -> statement.setString(1, id); statement.setString(2, userId); statement.executeQuery().use { if (it.next()) it.toFleetVehicle(connection) else null } }

    private fun ResultSet.toFleetVehicle(connection: Connection): FleetVehicle {
        val vehicleId = getString("id")
        val tasks = connection.prepareStatement("SELECT * FROM maintenance_tasks WHERE vehicle_id = ?::uuid ORDER BY created_at").use { statement ->
            statement.setString(1, vehicleId); statement.executeQuery().use { result -> buildList {
                while (result.next()) add(MaintenanceTask(result.getString("id"), result.getString("title"), result.getString("category"), result.getString("priority"), result.getInt("penalty"), result.getString("status"), result.getString("source"), result.getString("notes")))
            } }
        }
        val readiness = (100 - tasks.filter { it.status in setOf("accepted", "in_progress") }.sumOf { it.penalty }).coerceIn(0, 100)
        return FleetVehicle(vehicleId, getInt("year"), getString("make"), getString("model"), getString("trim"), getInt("mileage"), getString("vin"), getString("primary_use"), getObject("annual_mileage") as? Int, getString("notes"), getString("purpose"), getString("owner_name"), getObject("acquisition_price_cents") as? Long, getObject("target_sale_price_cents") as? Long, readiness, tasks)
    }
}
