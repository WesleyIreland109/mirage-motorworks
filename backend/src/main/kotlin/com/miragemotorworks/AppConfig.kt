package com.miragemotorworks

data class AppConfig(
    val port: Int = System.getenv("PORT")?.toIntOrNull() ?: 8080,
    val databaseUrl: String = System.getenv("DATABASE_URL")
        ?: "jdbc:postgresql://localhost:5432/mirage",
    val databaseUser: String = System.getenv("DATABASE_USER") ?: "mirage",
    val databasePassword: String = System.getenv("DATABASE_PASSWORD") ?: "mirage",
    val corsAllowedOrigins: List<String> = (System.getenv("CORS_ALLOWED_ORIGINS")
        ?: "http://localhost:5173,http://127.0.0.1:5173")
        .split(",")
        .map { it.trim() }
        .filter { it.isNotEmpty() }
)
