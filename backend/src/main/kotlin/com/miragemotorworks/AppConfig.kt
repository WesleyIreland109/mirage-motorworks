package com.miragemotorworks

data class AppConfig(
    val port: Int = System.getenv("PORT")?.toIntOrNull() ?: 8080,
    val databaseUrl: String = System.getenv("DATABASE_URL")
        ?: "jdbc:postgresql://localhost:5432/mirage",
    val databaseUser: String = System.getenv("DATABASE_USER") ?: "mirage",
    val databasePassword: String = System.getenv("DATABASE_PASSWORD") ?: "mirage",
    val sessionCookieSecure: Boolean = System.getenv("SESSION_COOKIE_SECURE")?.toBooleanStrictOrNull() ?: false,
    val sessionCookieSameSite: String = System.getenv("SESSION_COOKIE_SAME_SITE") ?: "Strict",
    val publicRegistrationEnabled: Boolean = System.getenv("PUBLIC_REGISTRATION_ENABLED")?.toBooleanStrictOrNull() ?: false,
    val publicSiteUrl: String = System.getenv("PUBLIC_SITE_URL") ?: "http://localhost:5173",
    val resendApiKey: String? = System.getenv("RESEND_API_KEY")?.ifBlank { null },
    val emailFrom: String = System.getenv("EMAIL_FROM") ?: "Mirage Motorworks <accounts@miragemw.com>",
    val contactEmailTo: String = System.getenv("CONTACT_EMAIL_TO") ?: "wesley@miragemw.com",
    val cloudflareAccountId: String? = System.getenv("CLOUDFLARE_ACCOUNT_ID")?.trim()?.ifEmpty { null },
    val cloudflareAiToken: String? = System.getenv("CLOUDFLARE_AI_TOKEN")?.trim()?.ifEmpty { null },
    val mirageAiModel: String = System.getenv("MIRAGE_AI_MODEL") ?: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    val firecrawlApiKey: String? = System.getenv("FIRECRAWL_API_KEY")?.trim()?.ifEmpty { null },
    val bootstrapAdminEmail: String? = System.getenv("BOOTSTRAP_ADMIN_EMAIL")?.trim()?.lowercase()?.ifEmpty { null },
    val bootstrapAdminPassword: String? = System.getenv("BOOTSTRAP_ADMIN_PASSWORD")?.ifEmpty { null },
    val corsAllowedOrigins: List<String> = (System.getenv("CORS_ALLOWED_ORIGINS")
        ?: "http://localhost:5173,http://127.0.0.1:5173")
        .split(",")
        .map { it.trim() }
        .filter { it.isNotEmpty() }
)
