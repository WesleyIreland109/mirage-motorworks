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
        module(config, VehicleRepository(database), auth, FleetRepository(database), TelemetryRepository(database))
    }.start(wait = true)
}

fun Application.module(config: AppConfig, vehicles: VehicleRepository, auth: AuthRepository, fleet: FleetRepository, telemetry: TelemetryRepository) {
    val authLimiter = AuthRateLimiter()
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

        route("/api/fleet") {
            get {
                val user = call.authenticatedUser(auth) ?: return@get
                call.respond(fleet.list(user.id))
            }
            post {
                val user = call.authenticatedUser(auth) ?: return@post
                runCatching { fleet.create(user.id, call.receive<FleetVehicleInput>()) }
                    .onSuccess { call.respond(HttpStatusCode.Created, it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Check the vehicle details and questionnaire")) }
            }
            put("/tasks/{id}") {
                val user = call.authenticatedUser(auth) ?: return@put
                val taskId = call.parameters["id"].orEmpty()
                val vehicle = runCatching { fleet.updateTask(user.id, taskId, call.receive<TaskUpdate>()) }.getOrNull()
                if (vehicle == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Task not found")) else call.respond(vehicle)
            }
        }

        route("/api/telemetry-sessions") {
            get {
                val user = call.authenticatedUser(auth) ?: return@get
                call.respond(telemetry.list(user.id, call.request.queryParameters["vehicleId"]))
            }
            post {
                val user = call.authenticatedUser(auth) ?: return@post
                runCatching { telemetry.import(user.id, call.receive<SessionImport>()) }
                    .onSuccess { call.respond(HttpStatusCode.Created, it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid or unauthorized session import")) }
            }
            put("/{id}/report") {
                val user = call.authenticatedUser(auth) ?: return@put
                val id = call.parameters["id"].orEmpty()
                runCatching { telemetry.saveReport(user.id, id, call.receive<ReportDraft>()) }
                    .onSuccess { call.respond(it) }
                    .onFailure { call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Unable to save report")) }
            }
            post("/{id}/publish") {
                val user = call.authenticatedUser(auth) ?: return@post
                val report = telemetry.publish(user.id, call.parameters["id"].orEmpty())
                if (report == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Draft report not found")) else call.respond(report)
            }
        }

        get("/api/drive-reports/{token}") {
            val report = telemetry.publicReport(call.parameters["token"].orEmpty())
            if (report == null) call.respond(HttpStatusCode.NotFound, mapOf("message" to "Report not found")) else call.respond(report)
        }
    }
}

private const val SESSION_COOKIE = "mirage_session"

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
