package com.miragemotorworks

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.sql.ResultSet
import java.util.UUID

class TelemetryRepository(private val database: Database) {
    private val json = Json { ignoreUnknownKeys = true }

    fun import(userId: String, input: SessionImport): TelemetrySession = database.withConnection { connection ->
        require(input.externalSessionId.isNotBlank() && input.durationMs >= 0 && input.samples >= 0)
        require(input.source in setOf("vehicle", "simulator", "unknown"))
        val ownsVehicle = connection.prepareStatement("SELECT 1 FROM owned_vehicles WHERE id = ?::uuid AND user_id = ?::uuid").use { statement ->
            statement.setString(1, input.vehicleId); statement.setString(2, userId); statement.executeQuery().use { it.next() }
        }
        require(ownsVehicle)
        val id = UUID.randomUUID()
        connection.prepareStatement("""INSERT INTO telemetry_sessions
            (id, vehicle_id, external_session_id, label, started_at, duration_ms, samples, obd_requests, obd_errors, source, metrics_json)
            VALUES (?, ?::uuid, ?, ?, ?::timestamptz, ?, ?, ?, ?, ?, ?::jsonb)
            ON CONFLICT (vehicle_id, external_session_id) DO UPDATE SET label=EXCLUDED.label, metrics_json=EXCLUDED.metrics_json
            RETURNING *""").use { statement ->
            statement.setObject(1, id); statement.setString(2, input.vehicleId); statement.setString(3, input.externalSessionId)
            statement.setString(4, input.label); statement.setString(5, input.startedAt); statement.setLong(6, input.durationMs)
            statement.setLong(7, input.samples); statement.setLong(8, input.obdRequests); statement.setLong(9, input.obdErrors)
            statement.setString(10, input.source); statement.setString(11, json.encodeToString(input.metrics))
            statement.executeQuery().use { result -> result.next(); result.toSession() }
        }
    }

    fun list(userId: String, vehicleId: String? = null): List<TelemetrySession> = database.withConnection { connection ->
        val sql = if (vehicleId == null) """SELECT s.* FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id
            WHERE v.user_id=?::uuid ORDER BY s.started_at DESC""" else """SELECT s.* FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id
            WHERE v.user_id=?::uuid AND s.vehicle_id=?::uuid ORDER BY s.started_at DESC"""
        connection.prepareStatement(sql).use { statement ->
            statement.setString(1, userId); if (vehicleId != null) statement.setString(2, vehicleId)
            statement.executeQuery().use { result -> buildList { while (result.next()) add(result.toSession()) } }
        }
    }

    fun saveReport(userId: String, sessionId: String, draft: ReportDraft): DriveReport = database.withConnection { connection ->
        require(draft.title.isNotBlank() && draft.overview.isNotBlank())
        val owns = connection.prepareStatement("""SELECT 1 FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id WHERE s.id=?::uuid AND v.user_id=?::uuid""").use { statement -> statement.setString(1, sessionId); statement.setString(2, userId); statement.executeQuery().use { it.next() } }
        require(owns)
        val id = UUID.randomUUID(); val token = UUID.randomUUID().toString().replace("-", "")
        connection.prepareStatement("""INSERT INTO drive_reports (id,session_id,public_token,title,overview,observations_json)
            VALUES (?,?::uuid,?,?,?,?::jsonb) ON CONFLICT (session_id) DO UPDATE SET title=EXCLUDED.title,overview=EXCLUDED.overview,observations_json=EXCLUDED.observations_json,updated_at=NOW() RETURNING id""").use { statement ->
            statement.setObject(1,id); statement.setString(2,sessionId); statement.setString(3,token); statement.setString(4,draft.title); statement.setString(5,draft.overview); statement.setString(6,json.encodeToString(draft.observations)); statement.executeQuery().use { it.next() }
        }
        reportForUser(userId, sessionId)!!
    }

    fun publish(userId: String, sessionId: String): DriveReport? { database.withConnection { c -> c.prepareStatement("""UPDATE drive_reports r SET status='published',published_at=NOW(),updated_at=NOW() FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id WHERE r.session_id=s.id AND s.id=?::uuid AND v.user_id=?::uuid""").use { it.setString(1,sessionId);it.setString(2,userId);it.executeUpdate() } }; return reportForUser(userId,sessionId) }
    fun publicReport(token: String): DriveReport? = database.withConnection { c -> queryReport(c.prepareStatement(reportSQL()+" WHERE r.public_token=? AND r.status='published'").apply { setString(1,token) }) }
    private fun reportForUser(userId:String, sessionId:String):DriveReport? = database.withConnection { c -> queryReport(c.prepareStatement(reportSQL()+" WHERE s.id=?::uuid AND v.user_id=?::uuid").apply {setString(1,sessionId);setString(2,userId)}) }
    private fun reportSQL()="""SELECT r.*,s.label session_label,s.started_at,s.source,s.metrics_json,v.year,v.make,v.model FROM drive_reports r JOIN telemetry_sessions s ON s.id=r.session_id JOIN owned_vehicles v ON v.id=s.vehicle_id"""
    private fun queryReport(statement:java.sql.PreparedStatement):DriveReport? = statement.use { s -> s.executeQuery().use { r -> if(!r.next()) null else DriveReport(r.getString("id"),r.getString("session_id"),r.getString("public_token"),r.getString("title"),r.getString("overview"),json.decodeFromString(r.getString("observations_json")),r.getString("status"),r.getObject("published_at")?.toString(),"${r.getInt("year")} ${r.getString("make")} ${r.getString("model")}",r.getString("session_label"),r.getString("started_at"),r.getString("source"),json.decodeFromString(r.getString("metrics_json"))) } }
    private fun ResultSet.toSession()=TelemetrySession(getString("id"),getString("vehicle_id"),getString("external_session_id"),getString("label"),getString("started_at"),getLong("duration_ms"),getLong("samples"),getLong("obd_requests"),getLong("obd_errors"),getString("source"),json.decodeFromString(getString("metrics_json")),getString("imported_at"))
}
