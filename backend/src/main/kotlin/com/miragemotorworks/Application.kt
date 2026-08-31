package com.miragemotorworks

import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.Cookie
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.request.receive
import io.ktor.server.plugins.origin
import io.ktor.server.response.respond
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json

fun main() {
    val config = AppConfig()
    val database = Database(config)
    database.migrate()

    val auth = AuthRepository(database)
    auth.bootstrapAdmin(config.bootstrapAdminEmail, config.bootstrapAdminPassword)

    embeddedServer(Netty, port = config.port, host = "0.0.0.0") {
        module(config, VehicleRepository(database), auth, FleetRepository(database), TelemetryRepository(database), ProspectRepository(database))
    }.start(wait = true)
}

fun Application.module(config: AppConfig, vehicles: VehicleRepository, auth: AuthRepository, fleet: FleetRepository, telemetry: TelemetryRepository, prospects: ProspectRepository) {
    val authLimiter = AuthRateLimiter()
    val emailService = EmailService(config)
    val mirageAI = MirageAIService(config)
    val logger = environment.log
    install(CallLogging)
    install(ContentNegotiation) {
        json(
            Json {
                prettyPrint = false
                ignoreUnknownKeys = true
            }
        )
    }
    install(CORS) {
        config.corsAllowedOrigins.forEach { origin ->
            allowHost(origin.removePrefix("http://").removePrefix("https://"), schemes = listOf("http", "https"))
        }
        allowHeader(HttpHeaders.ContentType)
        allowCredentials = true
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
    }

    routing {
        get("/health") {
            call.respond(mapOf("status" to "ok"))
        }

        post("/api/contact") {
            val request = runCatching { call.receive<ContactInquiryRequest>() }.getOrNull()
            if (request == null || !request.isValidContactInquiry()) {
                call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Check the contact form details."))
                return@post
            }
            val rateKey = "contact:${call.request.origin.remoteHost}:${request.email.trim().lowercase()}"
            if (!authLimiter.allow(rateKey)) {
                call.respond(HttpStatusCode.TooManyRequests, mapOf("message" to "Too many attempts. Try again later."))
                return@post
            }
            if (!emailService.sendContactInquiry(request)) {
                logger.error("Unable to deliver contact inquiry; verify RESEND_API_KEY, EMAIL_FROM, CONTACT_EMAIL_TO, and domain verification")
                call.respond(HttpStatusCode.ServiceUnavailable, mapOf("message" to "Unable to send the inquiry right now."))
                return@post
            }
            authLimiter.reset(rateKey)
            call.respond(HttpStatusCode.Accepted, ContactInquiryResponse("Inquiry sent."))
        }

        route("/api/auth") {
            post("/login") {
                val request = call.receive<LoginRequest>()
                val rateKey = "login:${call.request.origin.remoteHost}:${request.email.trim().lowercase()}"
                if (!authLimiter.allow(rateKey)) {
                    call.respond(HttpStatusCode.TooManyRequests, mapOf("message" to "Too many attempts. Try again later."))
                    return@post
                }
                val session = auth.login(request.email, request.password)
                if (session == null) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("message" to "Invalid email or password"))
                } else {
                    authLimiter.reset(rateKey)
                    call.setSessionCookie(config, session.token)
                    call.respond(AuthResponse(session.user))
                }
            }

            post("/register") {
                if (!config.publicRegistrationEnabled) {
                    call.respond(HttpStatusCode.NotFound, mapOf("message" to "Registration is unavailable")); return@post
                }
                val request = call.receive<RegisterRequest>()
                val rateKey = "register:${call.request.origin.remoteHost}"
                if (!authLimiter.allow(rateKey)) {
                    call.respond(HttpStatusCode.TooManyRequests, mapOf("message" to "Too many attempts. Try again later.")); return@post
                }
                val session = runCatching { auth.register(request) }.getOrNull()
                if (session == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Unable to create account. Check the details or sign in."))
                } else {
                    authLimiter.reset(rateKey); call.setSessionCookie(config, session.token); call.respond(HttpStatusCode.Created, AuthResponse(session.user))
                }
            }

            post("/forgot-password") {
                val request = call.receive<ForgotPasswordRequest>()
                val rateKey = "forgot:${call.request.origin.remoteHost}:${request.email.trim().lowercase()}"
                if (!authLimiter.allow(rateKey)) {
                    call.respond(HttpStatusCode.TooManyRequests, mapOf("message" to "Too many attempts. Try again later.")); return@post
                }
                val delivery = runCatching { auth.createPasswordReset(request.email) }.getOrNull()
                if (delivery != null && !emailService.sendPasswordReset(delivery.email, delivery.token)) {
                    logger.error("Unable to deliver password reset email; verify RESEND_API_KEY, EMAIL_FROM, and domain verification")
                }
                call.respond(HttpStatusCode.Accepted, mapOf("message" to "If that account exists, a reset link has been sent."))
            }

            post("/reset-password") {
                val request = call.receive<ResetPasswordRequest>()
                val rateKey = "reset:${call.request.origin.remoteHost}"
                if (!authLimiter.allow(rateKey)) {
                    call.respond(HttpStatusCode.TooManyRequests, mapOf("message" to "Too many attempts. Try again later.")); return@post
                }
                val changed = runCatching { auth.resetPassword(request.token, request.password) }.getOrDefault(false)
                if (!changed) call.respond(HttpStatusCode.BadRequest, mapOf("message" to "The reset link is invalid or expired."))
                else call.respond(mapOf("message" to "Password updated. Sign in with your new password."))
            }

            get("/me") {
                val user = auth.findUserByToken(call.request.cookies[SESSION_COOKIE])
                if (user == null) call.respond(HttpStatusCode.Unauthorized, mapOf("message" to "Not signed in"))
                else call.respond(AuthResponse(user))
            }

            post("/logout") {
                auth.logout(call.request.cookies[SESSION_COOKIE])
                call.response.cookies.appendExpired(SESSION_COOKIE, path = "/")
                call.respond(HttpStatusCode.NoContent)
            }

            get("/profile") {
                val user = call.authenticatedUser(auth) ?: return@get
                val profile = auth.profile(user.id)
                if (profile == null) call.respond(HttpStatusCode.NotFound) else call.respond(profile)
            }
            put("/profile") {
                val user = call.authenticatedUser(auth) ?: return@put
                val profile = runCatching { auth.updateProfile(user.id, call.receive<ProfileUpdate>()) }.getOrNull()
                if (profile == null) call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Check the profile details")) else call.respond(profile)
            }
        }

        route("/api/vehicles") {
            get {
                call.respond(vehicles.list())
            }

            get("/{slug}") {
                val slug = call.parameters["slug"].orEmpty()
                val vehicle = vehicles.findBySlug(slug)
                if (vehicle == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("message" to "Vehicle not found"))
                } else {
                    call.respond(vehicle)
                }
            }

            post {
                if (!call.requireAdmin(auth)) return@post
                val input = call.receive<VehicleInput>()
                call.respond(HttpStatusCode.Created, vehicles.create(input))
            }

            put("/{id}") {
                if (!call.requireAdmin(auth)) return@put
                val id = call.parameters["id"].orEmpty()
                val input = call.receive<VehicleInput>()
                val vehicle = vehicles.update(id, input)
                if (vehicle == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("message" to "Vehicle not found"))
                } else {
                    call.respond(vehicle)
                }
            }

            delete("/{id}") {
                if (!call.requireAdmin(auth)) return@delete
                val id = call.parameters["id"].orEmpty()
                if (vehicles.delete(id)) {
                    call.respond(HttpStatusCode.NoContent)
                } else {
                    call.respond(HttpStatusCode.NotFound, mapOf("message" to "Vehicle not found"))
                }
            }
        }

        route("/api/admin/users") {
            get {
                if (!call.requireAdmin(auth)) return@get
                call.respond(auth.listUsers())
            }
            put("/{id}/promote") {
                if (!call.requireAdmin(auth)) return@put
                val promoted = runCatching {
                    auth.promoteToAdmin(call.parameters["id"].orEmpty())
                }.getOrNull()
                if (promoted == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("message" to "User not found"))
                } else {
                    call.respond(promoted)
                }
            }
        }

        route("/api/users") {
            get {
                call.authenticatedUser(auth) ?: return@get
                call.respond(auth.listUsers())
            }
        }

        route("/api/fleet") {
            get {
                val user = call.authenticatedUser(auth) ?: return@get
                call.respond(fleet.list(user.id, user.role == "admin"))
            }
            post {
                val user = call.authenticatedUser(auth) ?: return@post
                runCatching { fleet.create(user.id, call.receive<FleetVehicleInput>()) }
                    .onSuccess { call.respond(HttpStatusCode.Created, it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Check the vehicle details and questionnaire")) }
            }
            put("/{id}") {
                val user = call.authenticatedUser(auth) ?: return@put
                val vehicle = runCatching { fleet.updateVehicle(user.id, call.parameters["id"].orEmpty(), call.receive<FleetVehicleUpdate>(), user.role == "admin") }.getOrNull()
                if (vehicle == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Vehicle not found")) else call.respond(vehicle)
            }
            delete("/{id}") {
                val user = call.authenticatedUser(auth) ?: return@delete
                val deleted = runCatching { fleet.deleteVehicle(user.id, call.parameters["id"].orEmpty(), user.role == "admin") }.getOrDefault(false)
                if (deleted) call.respond(HttpStatusCode.NoContent) else call.respond(HttpStatusCode.NotFound, mapOf("message" to "Vehicle not found"))
            }
            put("/tasks/{id}") {
                val user = call.authenticatedUser(auth) ?: return@put
                val taskId = call.parameters["id"].orEmpty()
                val vehicle = runCatching { fleet.updateTask(user.id, taskId, call.receive<TaskUpdate>(), user.role == "admin") }.getOrNull()
                if (vehicle == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Task not found")) else call.respond(vehicle)
            }
            post("/{id}/shares") {
                val user = call.authenticatedUser(auth) ?: return@post
                val vehicleId = call.parameters["id"].orEmpty()
                runCatching { fleet.shareVehicle(user.id, vehicleId, call.receive<FleetShareRequest>()) }
                    .onSuccess {
                        if (it == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Vehicle not found"))
                        else call.respond(HttpStatusCode.Created, it)
                    }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Select an existing GarageOS user to share this vehicle.")) }
            }
            delete("/{vehicleId}/shares/{shareId}") {
                val user = call.authenticatedUser(auth) ?: return@delete
                val vehicle = fleet.removeShare(user.id, call.parameters["vehicleId"].orEmpty(), call.parameters["shareId"].orEmpty())
                if (vehicle == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Share not found")) else call.respond(vehicle)
            }
        }

        route("/api/telemetry-sessions") {
            get {
                val user = call.authenticatedUser(auth) ?: return@get
                val status = call.request.queryParameters["status"] ?: "active"
                if (status !in setOf("active", "archived")) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Telemetry status must be active or archived."))
                    return@get
                }
                call.respond(telemetry.list(user.id, call.request.queryParameters["vehicleId"], user.role == "admin", status))
            }
            get("/intake") {
                val user = call.authenticatedUser(auth) ?: return@get
                call.respond(telemetry.listIntake(user.id, user.role == "admin"))
            }
            post("/bulk") {
                val user = call.authenticatedUser(auth) ?: return@post
                val input = runCatching { call.receive<BulkTelemetryImportRequest>() }.getOrNull()
                if (input == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Check the bulk telemetry payload."))
                    return@post
                }
                runCatching { telemetry.bulkImport(user.id, input, user.role == "admin") }
                    .onSuccess { call.respond(HttpStatusCode.Created, it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Unable to bulk import those telemetry sessions.")) }
            }
            post("/intake/{id}/assign") {
                val user = call.authenticatedUser(auth) ?: return@post
                val input = runCatching { call.receive<IntakeAssignRequest>() }.getOrNull()
                if (input == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Select a vehicle for this intake drive."))
                    return@post
                }
                val session = runCatching { telemetry.assignIntake(user.id, call.parameters["id"].orEmpty(), input.vehicleId, user.role == "admin") }.getOrNull()
                if (session == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Intake drive or vehicle not found"))
                else call.respond(HttpStatusCode.Created, session)
            }
            post {
                val user = call.authenticatedUser(auth) ?: return@post
                runCatching { telemetry.import(user.id, call.receive<SessionImport>(), user.role == "admin") }
                    .onSuccess { call.respond(HttpStatusCode.Created, it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid or unauthorized session import")) }
            }
            put("/{id}/restore") {
                val user = call.authenticatedUser(auth) ?: return@put
                val session = runCatching { telemetry.restore(user.id, call.parameters["id"].orEmpty(), user.role == "admin") }.getOrNull()
                if (session == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Archived telemetry session not found")) else call.respond(session)
            }
            put("/{id}") {
                val user = call.authenticatedUser(auth) ?: return@put
                val session = runCatching { telemetry.update(user.id, call.parameters["id"].orEmpty(), call.receive<TelemetrySessionUpdate>(), user.role == "admin") }.getOrNull()
                if (session == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Telemetry session not found")) else call.respond(session)
            }
            delete("/{id}") {
                val user = call.authenticatedUser(auth) ?: return@delete
                val archived = runCatching { telemetry.archive(user.id, call.parameters["id"].orEmpty(), user.role == "admin") }.getOrDefault(false)
                if (archived) call.respond(HttpStatusCode.NoContent)
                else call.respond(HttpStatusCode.NotFound, mapOf("message" to "Telemetry session not found"))
            }
            get("/{id}/report") {
                val user = call.authenticatedUser(auth) ?: return@get
                val report = telemetry.report(user.id, call.parameters["id"].orEmpty(), user.role == "admin")
                if (report == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Drive report not found")) else call.respond(report)
            }
            put("/{id}/report") {
                val user = call.authenticatedUser(auth) ?: return@put
                val id = call.parameters["id"].orEmpty()
                runCatching { telemetry.saveReport(user.id, id, call.receive<ReportDraft>(), user.role == "admin") }
                    .onSuccess { call.respond(it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Unable to save report")) }
            }
            post("/{id}/publish") {
                val user = call.authenticatedUser(auth) ?: return@post
                val access = runCatching { call.receive<PublishReportRequest>() }.getOrDefault(PublishReportRequest())
                val report = runCatching { telemetry.publish(user.id, call.parameters["id"].orEmpty(), access, user.role == "admin") }.getOrNull()
                if (report == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Draft report not found")) else call.respond(report)
            }
        }

        route("/api/prospects") {
            get {
                val user = call.authenticatedUser(auth) ?: return@get
                if (user.role != "admin") {
                    call.respond(HttpStatusCode.Forbidden, mapOf("message" to "Administrator access required"))
                    return@get
                }
                call.respond(prospects.list())
            }
            post {
                val user = call.authenticatedUser(auth) ?: return@post
                if (user.role != "admin") {
                    call.respond(HttpStatusCode.Forbidden, mapOf("message" to "Administrator access required"))
                    return@post
                }
                runCatching { prospects.create(user.id, call.receive<ProspectReportInput>()) }
                    .onSuccess { call.respond(HttpStatusCode.Created, it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Check the prospect link, vehicle details, and inspection notes.")) }
            }
            post("/analyze") {
                val user = call.authenticatedUser(auth) ?: return@post
                if (user.role != "admin") {
                    call.respond(HttpStatusCode.Forbidden, mapOf("message" to "Administrator access required"))
                    return@post
                }
                val rateKey = "prospect-ai:${user.id}"
                if (!authLimiter.allow(rateKey)) {
                    call.respond(HttpStatusCode.TooManyRequests, mapOf("message" to "MirageAI needs a moment before another prospect analysis."))
                    return@post
                }
                val input = runCatching { call.receive<ProspectAIRequest>() }.getOrNull()
                if (input == null || input.prospect.listingUrl.trim().length !in 8..2000) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Add a valid listing URL before running MirageAI."))
                    return@post
                }
                val result = mirageAI.analyzeProspect(input)
                if (result == null) call.respond(HttpStatusCode.ServiceUnavailable, mapOf("message" to "MirageAI is not configured or temporarily unavailable"))
                else call.respond(result)
            }
            post("/scrape") {
                val user = call.authenticatedUser(auth) ?: return@post
                if (user.role != "admin") {
                    call.respond(HttpStatusCode.Forbidden, mapOf("message" to "Administrator access required"))
                    return@post
                }
                val input = runCatching { call.receive<ProspectScrapeRequest>() }.getOrNull()
                if (input == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Check the scrape filters."))
                    return@post
                }
                val result = mirageAI.scrapeProspects(input)
                if (result == null) call.respond(HttpStatusCode.ServiceUnavailable, mapOf("message" to "Firecrawl is not configured or temporarily unavailable"))
                else call.respond(result)
            }
            put("/{id}") {
                val user = call.authenticatedUser(auth) ?: return@put
                if (user.role != "admin") {
                    call.respond(HttpStatusCode.Forbidden, mapOf("message" to "Administrator access required"))
                    return@put
                }
                val prospect = runCatching { prospects.update(call.parameters["id"].orEmpty(), call.receive<ProspectReportInput>()) }.getOrNull()
                if (prospect == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Prospect not found")) else call.respond(prospect)
            }
            delete("/{id}") {
                val user = call.authenticatedUser(auth) ?: return@delete
                if (user.role != "admin") {
                    call.respond(HttpStatusCode.Forbidden, mapOf("message" to "Administrator access required"))
                    return@delete
                }
                if (prospects.delete(call.parameters["id"].orEmpty())) call.respond(HttpStatusCode.NoContent)
                else call.respond(HttpStatusCode.NotFound, mapOf("message" to "Prospect not found"))
            }
        }

        post("/api/mirage-ai/analyze") {
            val user = call.authenticatedUser(auth) ?: return@post
            val rateKey = "mirage-ai:${user.id}"
            if (!authLimiter.allow(rateKey)) {
                call.respond(HttpStatusCode.TooManyRequests, mapOf("message" to "MirageAI needs a moment before another request.")); return@post
            }
            val input = runCatching { call.receive<MirageAIRequest>() }.getOrNull()
            if (input == null || input.metrics.size > 100) {
                call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid telemetry summary")); return@post
            }
            val result = mirageAI.analyze(input.copy(assessments = MetricReferences.assess(input.metrics)))
            if (result == null) call.respond(HttpStatusCode.ServiceUnavailable, mapOf("message" to "MirageAI is not configured or temporarily unavailable"))
            else call.respond(result)
        }

        get("/api/drive-reports/{token}") {
            val viewer = auth.findUserByToken(call.request.cookies[SESSION_COOKIE])
            val report = telemetry.accessibleReport(call.parameters["token"].orEmpty(), viewer)
            if (report == null) call.respond(if (viewer == null) HttpStatusCode.Unauthorized else HttpStatusCode.NotFound, mapOf("message" to "Report not found or access not granted")) else call.respond(report)
        }
    }
}

private const val SESSION_COOKIE = "mirage_session"

private fun ContactInquiryRequest.isValidContactInquiry(): Boolean {
    val emailPattern = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
    return name.trim().length in 2..120 &&
        email.trim().length in 5..160 &&
        email.trim().matches(emailPattern) &&
        subject.trim().length in 2..160 &&
        message.trim().length in 10..4000
}

private suspend fun io.ktor.server.application.ApplicationCall.requireUser(auth: AuthRepository): Boolean {
    if (auth.findUserByToken(request.cookies[SESSION_COOKIE]) != null) return true
    respond(HttpStatusCode.Unauthorized, mapOf("message" to "Authentication required"))
    return false
}

private suspend fun io.ktor.server.application.ApplicationCall.requireAdmin(auth: AuthRepository): Boolean {
    val user = auth.findUserByToken(request.cookies[SESSION_COOKIE])
    if (user?.role == "admin") return true
    respond(if (user == null) HttpStatusCode.Unauthorized else HttpStatusCode.Forbidden, mapOf("message" to "Administrator access required"))
    return false
}

private fun io.ktor.server.application.ApplicationCall.setSessionCookie(config: AppConfig, token: String) {
    response.cookies.append(Cookie(name = SESSION_COOKIE, value = token, path = "/", httpOnly = true,
        secure = config.sessionCookieSecure, maxAge = 30 * 24 * 60 * 60,
        extensions = mapOf("SameSite" to config.sessionCookieSameSite)))
}

private suspend fun io.ktor.server.application.ApplicationCall.authenticatedUser(auth: AuthRepository): AuthUser? {
    val user = auth.findUserByToken(request.cookies[SESSION_COOKIE])
    if (user == null) respond(HttpStatusCode.Unauthorized, mapOf("message" to "Authentication required"))
    return user
}
