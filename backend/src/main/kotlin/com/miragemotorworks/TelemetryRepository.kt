package com.miragemotorworks

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.sql.ResultSet
import java.util.UUID

class TelemetryRepository(private val database: Database) {
    private val json = Json { ignoreUnknownKeys = true }

    fun import(userId: String, input: SessionImport, isAdmin: Boolean = false): TelemetrySession = database.withConnection { connection ->
        require(input.externalSessionId.isNotBlank() && input.durationMs >= 0 && input.samples >= 0)
        require(input.source in setOf("vehicle", "simulator", "unknown") && (input.recordedMileage == null || input.recordedMileage >= 0))
        val canEditVehicle = connection.prepareStatement(
            """SELECT 1 FROM owned_vehicles v
            LEFT JOIN owned_vehicle_shares s ON s.vehicle_id = v.id AND s.user_id = ?::uuid
            WHERE v.id = ?::uuid AND (v.user_id = ?::uuid OR s.permission = 'editor' OR (? AND v.purpose <> 'personal'))"""
        ).use { statement ->
            statement.setString(1, userId); statement.setString(2, input.vehicleId); statement.setString(3, userId); statement.setBoolean(4, isAdmin)
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

    fun list(userId: String, vehicleId: String? = null, isAdmin: Boolean = false): List<TelemetrySession> = database.withConnection { connection ->
        val sql = if (vehicleId == null) """SELECT s.* FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id
            LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid
            WHERE v.user_id=?::uuid OR sh.user_id=?::uuid OR (? AND v.purpose <> 'personal') ORDER BY s.started_at DESC""" else """SELECT s.* FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id
            LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid
            WHERE (v.user_id=?::uuid OR sh.user_id=?::uuid OR (? AND v.purpose <> 'personal')) AND s.vehicle_id=?::uuid ORDER BY s.started_at DESC"""
        connection.prepareStatement(sql).use { statement ->
            statement.setString(1, userId); statement.setString(2, userId); statement.setString(3, userId); statement.setBoolean(4, isAdmin); if (vehicleId != null) statement.setString(5, vehicleId)
            statement.executeQuery().use { result -> buildList { while (result.next()) add(result.toSession()) } }
        }
    }

    fun listIntake(userId: String, isAdmin: Boolean = false): List<TelemetryIntakeSession> = database.withConnection { connection ->
        val sql = if (isAdmin) {
            "SELECT * FROM telemetry_intake_sessions WHERE status = 'unassigned' ORDER BY started_at DESC"
        } else {
            "SELECT * FROM telemetry_intake_sessions WHERE status = 'unassigned' AND uploaded_by_user_id = ?::uuid ORDER BY started_at DESC"
        }
        connection.prepareStatement(sql).use { statement ->
            if (!isAdmin) statement.setString(1, userId)
            statement.executeQuery().use { result -> buildList { while (result.next()) add(result.toIntakeSession()) } }
        }
    }

    fun bulkImport(userId: String, input: BulkTelemetryImportRequest, isAdmin: Boolean = false): BulkTelemetryImportResult = database.withConnection { connection ->
        require(input.sessions.size <= 50)
        val imported = mutableListOf<TelemetrySession>()
        val queued = mutableListOf<TelemetryIntakeSession>()
        val skipped = mutableListOf<String>()
        connection.autoCommit = false
        try {
            input.sessions.forEach { session ->
                require(session.externalSessionId.isNotBlank() && session.durationMs >= 0 && session.samples >= 0)
                require(session.source in setOf("vehicle", "simulator", "unknown") && (session.recordedMileage == null || session.recordedMileage >= 0))
                if (sessionAlreadyExists(connection, session.externalSessionId)) {
                    skipped.add(session.externalSessionId)
                    return@forEach
                }
                val matchedVehicleId = findVehicleByVin(connection, userId, session.detectedVehicle.vin, isAdmin)
                if (matchedVehicleId != null) {
                    imported.add(insertTelemetrySession(connection, matchedVehicleId, session))
                } else {
                    queued.add(upsertIntakeSession(connection, userId, session))
                }
            }
            connection.commit()
            BulkTelemetryImportResult(imported, queued, skipped)
        } catch (exception: Exception) {
            connection.rollback()
            throw exception
        } finally {
            connection.autoCommit = true
        }
    }

    fun assignIntake(userId: String, intakeId: String, vehicleId: String, isAdmin: Boolean = false): TelemetrySession? = database.withConnection { connection ->
        connection.autoCommit = false
        try {
            val intake = connection.prepareStatement(
                if (isAdmin) "SELECT * FROM telemetry_intake_sessions WHERE id = ?::uuid AND status = 'unassigned'"
                else "SELECT * FROM telemetry_intake_sessions WHERE id = ?::uuid AND uploaded_by_user_id = ?::uuid AND status = 'unassigned'"
            ).use { statement ->
                statement.setString(1, intakeId)
                if (!isAdmin) statement.setString(2, userId)
                statement.executeQuery().use { result -> if (result.next()) result.toIntakeImport() else null }
            } ?: return@withConnection null
            if (!canEditVehicle(connection, userId, vehicleId, isAdmin)) return@withConnection null
            val session = insertTelemetrySession(connection, vehicleId, intake)
            connection.prepareStatement("UPDATE telemetry_intake_sessions SET status = 'assigned', assigned_vehicle_id = ?::uuid, assigned_at = NOW(), updated_at = NOW() WHERE id = ?::uuid").use {
                it.setString(1, vehicleId)
                it.setString(2, intakeId)
                it.executeUpdate()
            }
            connection.commit()
            session
        } catch (exception: Exception) {
            connection.rollback()
            throw exception
        } finally {
            connection.autoCommit = true
        }
    }

    fun update(userId: String, sessionId: String, update: TelemetrySessionUpdate, isAdmin: Boolean = false): TelemetrySession? {
        require(update.label.trim().length in 1..160)
        return database.withConnection { connection ->
            connection.prepareStatement(
                """UPDATE telemetry_sessions s SET label = ?, imported_at = imported_at
                FROM owned_vehicles v
                LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid
                WHERE s.id = ?::uuid AND s.vehicle_id = v.id AND (v.user_id = ?::uuid OR sh.permission = 'editor' OR (? AND v.purpose <> 'personal'))
                RETURNING s.*"""
            ).use { statement ->
                statement.setString(1, update.label.trim())
                statement.setString(2, userId)
                statement.setString(3, sessionId)
                statement.setString(4, userId)
                statement.setBoolean(5, isAdmin)
                statement.executeQuery().use { result -> if (result.next()) result.toSession() else null }
            }
        }
    }

    private fun canEditVehicle(connection: java.sql.Connection, userId: String, vehicleId: String, isAdmin: Boolean): Boolean =
        connection.prepareStatement(
            """SELECT 1 FROM owned_vehicles v
            LEFT JOIN owned_vehicle_shares s ON s.vehicle_id = v.id AND s.user_id = ?::uuid
            WHERE v.id = ?::uuid AND (v.user_id = ?::uuid OR s.permission = 'editor' OR (? AND v.purpose <> 'personal'))"""
        ).use { statement ->
            statement.setString(1, userId); statement.setString(2, vehicleId); statement.setString(3, userId); statement.setBoolean(4, isAdmin)
            statement.executeQuery().use { it.next() }
        }

    private fun sessionAlreadyExists(connection: java.sql.Connection, externalSessionId: String): Boolean =
        connection.prepareStatement(
            """SELECT 1 FROM telemetry_sessions WHERE external_session_id = ?
            UNION ALL
            SELECT 1 FROM telemetry_intake_sessions WHERE external_session_id = ? AND status = 'unassigned'
            LIMIT 1"""
        ).use { statement ->
            statement.setString(1, externalSessionId)
            statement.setString(2, externalSessionId)
            statement.executeQuery().use { it.next() }
        }

    private fun findVehicleByVin(connection: java.sql.Connection, userId: String, vin: String?, isAdmin: Boolean): String? {
        val normalizedVin = vin?.trim()?.uppercase()?.takeIf { it.length == 17 } ?: return null
        return connection.prepareStatement(
            """SELECT v.id FROM owned_vehicles v
            LEFT JOIN owned_vehicle_shares s ON s.vehicle_id = v.id AND s.user_id = ?::uuid
            WHERE UPPER(v.vin) = ? AND (v.user_id = ?::uuid OR s.permission = 'editor' OR (? AND v.purpose <> 'personal'))
            ORDER BY v.updated_at DESC LIMIT 1"""
        ).use { statement ->
            statement.setString(1, userId); statement.setString(2, normalizedVin); statement.setString(3, userId); statement.setBoolean(4, isAdmin)
            statement.executeQuery().use { if (it.next()) it.getString("id") else null }
        }
    }

    private fun insertTelemetrySession(connection: java.sql.Connection, vehicleId: String, input: TelemetryIntakeImport): TelemetrySession {
        val session = connection.prepareStatement("""INSERT INTO telemetry_sessions
            (id, vehicle_id, external_session_id, label, started_at, duration_ms, samples, obd_requests, obd_errors, source, metrics_json, recorded_mileage)
            VALUES (?, ?::uuid, ?, ?, ?::timestamptz, ?, ?, ?, ?, ?, ?::jsonb, ?)
            ON CONFLICT (vehicle_id, external_session_id) DO UPDATE SET label=EXCLUDED.label, metrics_json=EXCLUDED.metrics_json, recorded_mileage=EXCLUDED.recorded_mileage
            RETURNING *""").use { statement ->
            statement.setObject(1, UUID.randomUUID()); statement.setString(2, vehicleId); statement.setString(3, input.externalSessionId)
            statement.setString(4, input.label); statement.setString(5, input.startedAt); statement.setLong(6, input.durationMs)
            statement.setLong(7, input.samples); statement.setLong(8, input.obdRequests); statement.setLong(9, input.obdErrors)
            statement.setString(10, input.source); statement.setString(11, json.encodeToString(input.metrics))
            if (input.recordedMileage == null) statement.setNull(12, java.sql.Types.INTEGER) else statement.setInt(12, input.recordedMileage)
            statement.executeQuery().use { result -> result.next(); result.toSession() }
        }
        if (input.recordedMileage != null) connection.prepareStatement("UPDATE owned_vehicles SET mileage = ?, updated_at = NOW() WHERE id = ?::uuid").use {
            it.setInt(1, input.recordedMileage)
            it.setString(2, vehicleId)
            it.executeUpdate()
        }
        return session
    }

    private fun upsertIntakeSession(connection: java.sql.Connection, userId: String, input: TelemetryIntakeImport): TelemetryIntakeSession =
        connection.prepareStatement("""INSERT INTO telemetry_intake_sessions
            (id, uploaded_by_user_id, external_session_id, label, started_at, duration_ms, samples, obd_requests, obd_errors, source, metrics_json, recorded_mileage,
             detected_year, detected_make, detected_model, detected_trim, detected_vin, detected_profile_id)
            VALUES (?, ?::uuid, ?, ?, ?::timestamptz, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (external_session_id) DO UPDATE SET updated_at = NOW()
            RETURNING *""").use { statement ->
            val detected = input.detectedVehicle
            statement.setObject(1, UUID.randomUUID()); statement.setString(2, userId); statement.setString(3, input.externalSessionId)
            statement.setString(4, input.label); statement.setString(5, input.startedAt); statement.setLong(6, input.durationMs)
            statement.setLong(7, input.samples); statement.setLong(8, input.obdRequests); statement.setLong(9, input.obdErrors)
            statement.setString(10, input.source); statement.setString(11, json.encodeToString(input.metrics))
            if (input.recordedMileage == null) statement.setNull(12, java.sql.Types.INTEGER) else statement.setInt(12, input.recordedMileage)
            if (detected.year == null) statement.setNull(13, java.sql.Types.INTEGER) else statement.setInt(13, detected.year)
            statement.setString(14, detected.make?.trim()?.ifEmpty { null })
            statement.setString(15, detected.model?.trim()?.ifEmpty { null })
            statement.setString(16, detected.trim?.trim()?.ifEmpty { null })
            statement.setString(17, detected.vin?.trim()?.uppercase()?.ifEmpty { null })
            statement.setString(18, detected.profileId?.trim()?.ifEmpty { null })
            statement.executeQuery().use { result -> result.next(); result.toIntakeSession() }
        }

    fun delete(userId: String, sessionId: String, isAdmin: Boolean = false): Boolean = database.withConnection { connection ->
        connection.prepareStatement(
            """DELETE FROM telemetry_sessions s
            WHERE s.id = ?::uuid AND EXISTS (
                SELECT 1 FROM owned_vehicles v
                LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid
                WHERE v.id = s.vehicle_id AND (v.user_id = ?::uuid OR sh.permission = 'editor' OR (? AND v.purpose <> 'personal'))
            )"""
        ).use { statement ->
            statement.setString(1, sessionId)
            statement.setString(2, userId)
            statement.setString(3, userId)
            statement.setBoolean(4, isAdmin)
            statement.executeUpdate() > 0
        }
    }

    fun saveReport(userId: String, sessionId: String, draft: ReportDraft, isAdmin: Boolean = false): DriveReport = database.withConnection { connection ->
        require(draft.title.isNotBlank() && draft.overview.isNotBlank())
        val canEdit = connection.prepareStatement("""SELECT 1 FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid WHERE s.id=?::uuid AND (v.user_id=?::uuid OR sh.permission = 'editor' OR (? AND v.purpose <> 'personal'))""").use { statement -> statement.setString(1, userId); statement.setString(2, sessionId); statement.setString(3, userId); statement.setBoolean(4, isAdmin); statement.executeQuery().use { it.next() } }
        require(canEdit)
        val id = UUID.randomUUID(); val token = UUID.randomUUID().toString().replace("-", "")
        connection.prepareStatement("""INSERT INTO drive_reports (id,session_id,public_token,title,overview,observations_json)
            VALUES (?,?::uuid,?,?,?,?::jsonb) ON CONFLICT (session_id) DO UPDATE SET title=EXCLUDED.title,overview=EXCLUDED.overview,observations_json=EXCLUDED.observations_json,updated_at=NOW() RETURNING id""").use { statement ->
            statement.setObject(1,id); statement.setString(2,sessionId); statement.setString(3,token); statement.setString(4,draft.title); statement.setString(5,draft.overview); statement.setString(6,json.encodeToString(draft.observations)); statement.executeQuery().use { it.next() }
        }
        reportForUser(userId, sessionId, isAdmin)!!
    }

    fun report(userId: String, sessionId: String, isAdmin: Boolean = false): DriveReport? = reportForUser(userId, sessionId, isAdmin)

    fun publish(userId: String, sessionId: String, access: PublishReportRequest, isAdmin: Boolean = false): DriveReport? {
        require(access.visibility in setOf("private", "customer", "public"))
        require(access.visibility != "customer" || access.viewerUserId != null)
        database.withConnection { c -> c.prepareStatement("""UPDATE drive_reports r SET status='published',published_at=NOW(),visibility=?,viewer_user_id=?::uuid,updated_at=NOW() FROM telemetry_sessions s JOIN owned_vehicles v ON v.id=s.vehicle_id LEFT JOIN owned_vehicle_shares sh ON sh.vehicle_id = v.id AND sh.user_id = ?::uuid WHERE r.session_id=s.id AND s.id=?::uuid AND (v.user_id=?::uuid OR sh.permission = 'editor' OR (? AND v.purpose <> 'personal')) AND (? <> 'customer' OR EXISTS (SELECT 1 FROM users u WHERE u.id=?::uuid))""").use {
            it.setString(1,access.visibility);it.setString(2,access.viewerUserId);it.setString(3,userId);it.setString(4,sessionId);it.setString(5,userId);it.setBoolean(6,isAdmin);it.setString(7,access.visibility);it.setString(8,access.viewerUserId);it.executeUpdate()
        } }
        return reportForUser(userId,sessionId,isAdmin)
    }
    fun accessibleReport(token: String, viewer: AuthUser?): DriveReport? = database.withConnection { c ->
        val admin = viewer?.role == "admin"
        queryReport(c.prepareStatement(reportSQL()+" WHERE r.public_token=? AND r.status='published' AND (r.visibility='public' OR ? OR v.user_id=?::uuid OR r.viewer_user_id=?::uuid OR EXISTS (SELECT 1 FROM owned_vehicle_shares sh WHERE sh.vehicle_id = v.id AND sh.user_id = ?::uuid))").apply {
            setString(1,token);setBoolean(2,admin);setString(3,viewer?.id);setString(4,viewer?.id);setString(5,viewer?.id)
        })
    }
    private fun reportForUser(userId:String, sessionId:String, isAdmin:Boolean = false):DriveReport? = database.withConnection { c -> queryReport(c.prepareStatement(reportSQL()+" WHERE s.id=?::uuid AND (v.user_id=?::uuid OR EXISTS (SELECT 1 FROM owned_vehicle_shares sh WHERE sh.vehicle_id = v.id AND sh.user_id = ?::uuid) OR (? AND v.purpose <> 'personal'))").apply {setString(1,sessionId);setString(2,userId);setString(3,userId);setBoolean(4,isAdmin)}) }
    private fun reportSQL()="""SELECT r.*,s.label session_label,s.started_at,s.source,s.metrics_json,v.year,v.make,v.model,v.user_id owner_user_id FROM drive_reports r JOIN telemetry_sessions s ON s.id=r.session_id JOIN owned_vehicles v ON v.id=s.vehicle_id"""
    private fun queryReport(statement:java.sql.PreparedStatement):DriveReport? = statement.use { s -> s.executeQuery().use { r -> if(!r.next()) null else {
        val metrics: List<MetricSummary> = json.decodeFromString(r.getString("metrics_json"))
        DriveReport(r.getString("id"),r.getString("session_id"),r.getString("public_token"),r.getString("title"),r.getString("overview"),json.decodeFromString(r.getString("observations_json")),r.getString("status"),r.getObject("published_at")?.toString(),"${r.getInt("year")} ${r.getString("make")} ${r.getString("model")}",r.getString("session_label"),r.getString("started_at"),r.getString("source"),metrics,MetricReferences.assess(metrics),r.getString("visibility"),r.getString("viewer_user_id"))
    } } }
    private fun ResultSet.toSession()=TelemetrySession(getString("id"),getString("vehicle_id"),getString("external_session_id"),getString("label"),getString("started_at"),getLong("duration_ms"),getLong("samples"),getLong("obd_requests"),getLong("obd_errors"),getString("source"),json.decodeFromString(getString("metrics_json")),getString("imported_at"),(getObject("recorded_mileage") as? Number)?.toInt())
    private fun ResultSet.toIntakeSession()=TelemetryIntakeSession(getString("id"),getString("external_session_id"),getString("label"),getString("started_at"),getLong("duration_ms"),getLong("samples"),getLong("obd_requests"),getLong("obd_errors"),getString("source"),json.decodeFromString(getString("metrics_json")),(getObject("recorded_mileage") as? Number)?.toInt(),TelemetryVehicleIdentity((getObject("detected_year") as? Number)?.toInt(),getString("detected_make"),getString("detected_model"),getString("detected_trim"),getString("detected_vin"),getString("detected_profile_id")),getString("status"),getString("assigned_vehicle_id"),getString("created_at"),getString("updated_at"))
    private fun ResultSet.toIntakeImport()=TelemetryIntakeImport(getString("external_session_id"),getString("label"),getString("started_at"),getLong("duration_ms"),getLong("samples"),getLong("obd_requests"),getLong("obd_errors"),getString("source"),json.decodeFromString(getString("metrics_json")),(getObject("recorded_mileage") as? Number)?.toInt(),TelemetryVehicleIdentity((getObject("detected_year") as? Number)?.toInt(),getString("detected_make"),getString("detected_model"),getString("detected_trim"),getString("detected_vin"),getString("detected_profile_id")))
}
