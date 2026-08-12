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
        module(config, VehicleRepository(database), auth)
    }.start(wait = true)
}

fun Application.module(config: AppConfig, vehicles: VehicleRepository, auth: AuthRepository) {
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
                val session = auth.login(request.email, request.password)
                if (session == null) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("message" to "Invalid email or password"))
                } else {
                    call.response.cookies.append(
                        Cookie(
                            name = SESSION_COOKIE,
                            value = session.token,
                            path = "/",
                            httpOnly = true,
                            secure = config.sessionCookieSecure,
                            maxAge = 30 * 24 * 60 * 60,
                            extensions = mapOf("SameSite" to "Strict")
                        )
                    )
                    call.respond(AuthResponse(session.user))
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
                if (!call.requireUser(auth)) return@post
                val input = call.receive<VehicleInput>()
                call.respond(HttpStatusCode.Created, vehicles.create(input))
            }

            put("/{id}") {
                if (!call.requireUser(auth)) return@put
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
                if (!call.requireUser(auth)) return@delete
                val id = call.parameters["id"].orEmpty()
                if (vehicles.delete(id)) {
                    call.respond(HttpStatusCode.NoContent)
                } else {
                    call.respond(HttpStatusCode.NotFound, mapOf("message" to "Vehicle not found"))
                }
            }
        }
    }
}

private const val SESSION_COOKIE = "mirage_session"

private suspend fun io.ktor.server.application.ApplicationCall.requireUser(auth: AuthRepository): Boolean {
    if (auth.findUserByToken(request.cookies[SESSION_COOKIE]) != null) return true
    respond(HttpStatusCode.Unauthorized, mapOf("message" to "Authentication required"))
    return false
}
