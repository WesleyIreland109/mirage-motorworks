package com.miragemotorworks

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.sql.ResultSet
import java.util.UUID

class TelemetryRepository(private val database: Database) {
    private val json = Json { ignoreUnknownKeys = true }

    fun import(userId: String, input: SessionImport): TelemetrySession = database.withConnection { connection ->
        require(input.externalSessionId.isNotBlank() && input.durationMs >= 0 && input.samples >= 0)
        require(input.source in setOf("vehicle", "simulator", "unknown") && (input.recordedMileage == null || input.recordedMileage >= 0))
        val canEditVehicle = connection.prepareStatement(
            """SELECT 1 FROM owned_vehicles v
            LEFT JOIN owned_vehicle_shares s ON s.vehicle_id = v.id AND s.user_id = ?::uuid
            WHERE v.id = ?::uuid AND (v.user_id = ?::uuid OR s.permission = 'editor')"""
        ).use { statement ->
            statement.setString(1, userId); statement.setString(2, input.vehicleId); statement.setString(3, userId)
            statement.executeQuery().use { it.next() }
        }
        require(canEditVehicle)
        val id = UUID.randomUUID()
        connection.prepareStatement("""INSERT INTO telemetry_sessions
            (id, vehicle_id, external_session_id, label, started_at, duration_ms, samples, obd_requests, obd_errors, source, metrics_json, recorded_mileage)
            VALUES (?, ?::uuid, ?, ?, ?::timestamptz, ?, ?, ?, ?, ?, ?::jsonb, ?)
            ON CONFLICT (vehicle_id, external_session_id) DO UPDATE SET label=EXCLUDED.label, metrics_json=EXCLUDED.metrics_json, recorded_mileage=EXCLUDED.recorded_mileage
            RETURNING *""").use { statement ->
            statement.setObject(1, id); statement.setString(2, input.vehicleId); statement.setString(3, input.externalSessionId)
            statement.setString(4, input.label); statement.setString(5, input.startedAt); statement.setLong(6, input.durationMs)
            statement.setLong(7, input.samples); statement.setLong(8, input.obdRequests); statement.setLong(9, input.obdErrors)
            statement.setString(10, input.source); statement.setString(11, json.encodeToString(input.metrics))
            if (input.recordedMileage == null) statement.setNull(12, java.sql.Types.INTEGER) else statement.setInt(12, input.recordedMileage)
            val session = statement.executeQuery().use { result -> result.next(); result.toSession() }
            if (input.recordedMileage != null) connection.prepareStatement("UPDATE owned_vehicles SET mileage = ?, updated_at = NOW() WHERE id = ?::uuid").use {
                it.setInt(1, input.recordedMileage); it.setString(2, input.vehicleId); it.executeUpdate()
            }
            session
        }
    }

    fun list(userId: String, vehicleId: String? = null): List<TelemetrySession> = database.withConnection { connection ->
        val sql = if (vehicleId == null) """SELECT s.* FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id
            LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid
            WHERE v.user_id=?::uuid OR sh.user_id=?::uuid ORDER BY s.started_at DESC""" else """SELECT s.* FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id
            LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid
            WHERE (v.user_id=?::uuid OR sh.user_id=?::uuid) AND s.vehicle_id=?::uuid ORDER BY s.started_at DESC"""
        connection.prepareStatement(sql).use { statement ->
            statement.setString(1, userId); statement.setString(2, userId); statement.setString(3, userId); if (vehicleId != null) statement.setString(4, vehicleId)
            statement.executeQuery().use { result -> buildList { while (result.next()) add(result.toSession()) } }
        }
    }

    fun delete(userId: String, sessionId: String): Boolean = database.withConnection { connection ->
        connection.prepareStatement(
            """DELETE FROM telemetry_sessions s
            WHERE s.id = ?::uuid AND EXISTS (
                SELECT 1 FROM owned_vehicles v
                LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid
                WHERE v.id = s.vehicle_id AND (v.user_id = ?::uuid OR sh.permission = 'editor')
            )"""
        ).use { statement ->
            statement.setString(1, sessionId)
            statement.setString(2, userId)
            statement.setString(3, userId)
            statement.executeUpdate() > 0
        }
    }

    fun saveReport(userId: String, sessionId: String, draft: ReportDraft): DriveReport = database.withConnection { connection ->
        require(draft.title.isNotBlank() && draft.overview.isNotBlank())
        val canEdit = connection.prepareStatement("""SELECT 1 FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid WHERE s.id=?::uuid AND (v.user_id=?::uuid OR sh.permission = 'editor')""").use { statement -> statement.setString(1, userId); statement.setString(2, sessionId); statement.setString(3, userId); statement.executeQuery().use { it.next() } }
        require(canEdit)
        val id = UUID.randomUUID(); val token = UUID.randomUUID().toString().replace("-", "")
        connection.prepareStatement("""INSERT INTO drive_reports (id,session_id,public_token,title,overview,observations_json)
            VALUES (?,?::uuid,?,?,?,?::jsonb) ON CONFLICT (session_id) DO UPDATE SET title=EXCLUDED.title,overview=EXCLUDED.overview,observations_json=EXCLUDED.observations_json,updated_at=NOW() RETURNING id""").use { statement ->
            statement.setObject(1,id); statement.setString(2,sessionId); statement.setString(3,token); statement.setString(4,draft.title); statement.setString(5,draft.overview); statement.setString(6,json.encodeToString(draft.observations)); statement.executeQuery().use { it.next() }
        }
        reportForUser(userId, sessionId)!!
    }

    fun publish(userId: String, sessionId: String, access: PublishReportRequest): DriveReport? {
        require(access.visibility in setOf("private", "customer", "public"))
        require(access.visibility != "customer" || access.viewerUserId != null)
        database.withConnection { c -> c.prepareStatement("""UPDATE drive_reports r SET status='published',published_at=NOW(),visibility=?,viewer_user_id=?::uuid,updated_at=NOW() FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid WHERE r.session_id=s.id AND s.id=?::uuid AND (v.user_id=?::uuid OR sh.permission = 'editor') AND (? <> 'customer' OR EXISTS (SELECT 1 FROM users u WHERE u.id=?::uuid))""").use {
            it.setString(1,access.visibility);it.setString(2,access.viewerUserId);it.setString(3,userId);it.setString(4,sessionId);it.setString(5,userId);it.setString(6,access.visibility);it.setString(7,access.viewerUserId);it.executeUpdate()
        } }
        return reportForUser(userId,sessionId)
    }
    fun accessibleReport(token: String, viewer: AuthUser?): DriveReport? = database.withConnection { c ->
        val admin = viewer?.role == "admin"
        queryReport(c.prepareStatement(reportSQL()+" WHERE r.public_token=? AND r.status='published' AND (r.visibility='public' OR ? OR v.user_id=?::uuid OR r.viewer_user_id=?::uuid OR EXISTS (SELECT 1 FROM owned_vehicle_shares sh WHERE sh.vehicle_id = v.id AND sh.user_id = ?::uuid))").apply {
            setString(1,token);setBoolean(2,admin);setString(3,viewer?.id);setString(4,viewer?.id);setString(5,viewer?.id)
        })
    }
    private fun reportForUser(userId:String, sessionId:String):DriveReport? = database.withConnection { c -> queryReport(c.prepareStatement(reportSQL()+" WHERE s.id=?::uuid AND (v.user_id=?::uuid OR EXISTS (SELECT 1 FROM owned_vehicle_shares sh WHERE sh.vehicle_id = v.id AND sh.user_id = ?::uuid))").apply {setString(1,sessionId);setString(2,userId);setString(3,userId)}) }
    private fun reportSQL()="""SELECT r.*,s.label session_label,s.started_at,s.source,s.metrics_json,v.year,v.make,v.model,v.user_id owner_user_id FROM drive_reports r JOIN telemetry_sessions s ON s.id=r.session_id JOIN owned_vehicles v ON v.id=s.vehicle_id"""
    private fun queryReport(statement:java.sql.PreparedStatement):DriveReport? = statement.use { s -> s.executeQuery().use { r -> if(!r.next()) null else {
        val metrics: List<MetricSummary> = json.decodeFromString(r.getString("metrics_json"))
        DriveReport(r.getString("id"),r.getString("session_id"),r.getString("public_token"),r.getString("title"),r.getString("overview"),json.decodeFromString(r.getString("observations_json")),r.getString("status"),r.getObject("published_at")?.toString(),"${r.getInt("year")} ${r.getString("make")} ${r.getString("model")}",r.getString("session_label"),r.getString("started_at"),r.getString("source"),metrics,MetricReferences.assess(metrics),r.getString("visibility"),r.getString("viewer_user_id"))
    } } }
    private fun ResultSet.toSession()=TelemetrySession(getString("id"),getString("vehicle_id"),getString("external_session_id"),getString("label"),getString("started_at"),getLong("duration_ms"),getLong("samples"),getLong("obd_requests"),getLong("obd_errors"),getString("source"),json.decodeFromString(getString("metrics_json")),getString("imported_at"),(getObject("recorded_mileage") as? Number)?.toInt())
}
