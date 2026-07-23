package com.miragemotorworks

import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.calllogging.CallLogging
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

    embeddedServer(Netty, port = config.port, host = "0.0.0.0") {
        module(config, VehicleRepository(database))
    }.start(wait = true)
}

fun Application.module(config: AppConfig, vehicles: VehicleRepository) {
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
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
    }

    routing {
        get("/health") {
            call.respond(mapOf("status" to "ok"))
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
                val input = call.receive<VehicleInput>()
                call.respond(HttpStatusCode.Created, vehicles.create(input))
            }

            put("/{id}") {
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
