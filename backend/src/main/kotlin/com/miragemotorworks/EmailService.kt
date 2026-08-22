package com.miragemotorworks

import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class EmailService(private val config: AppConfig) {
    private val client = HttpClient.newHttpClient()

    fun sendPasswordReset(email: String, token: String): Boolean {
        val apiKey = config.resendApiKey ?: return false
        val resetUrl = "${config.publicSiteUrl.trimEnd('/')}/reset-password?token=$token"
        val payload = buildJsonObject {
            put("from", config.emailFrom)
            put("to", email)
            put("subject", "Reset your Mirage Motorworks password")
            put("text", "Use this link within 30 minutes to reset your Mirage Motorworks password:\n\n$resetUrl\n\nIf you did not request this, you can ignore this email.")
            put("html", "<p>Use the link below within 30 minutes to reset your Mirage Motorworks password.</p><p><a href=\"$resetUrl\">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>")
        }.toString()
        val request = HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
            .header("Authorization", "Bearer $apiKey")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build()
        return runCatching { client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() in 200..299 }.getOrDefault(false)
    }

    fun sendContactInquiry(inquiry: ContactInquiryRequest): Boolean {
        val apiKey = config.resendApiKey ?: return false
        val cleanName = inquiry.name.trim()
        val cleanEmail = inquiry.email.trim()
        val cleanSubject = inquiry.subject.trim().replace(Regex("\\s+"), " ")
        val cleanMessage = inquiry.message.trim()
        val textBody = """
            New Mirage Motorworks inquiry

            Name: $cleanName
            Email: $cleanEmail
            Subject: $cleanSubject

            Message:
            $cleanMessage
        """.trimIndent()
        val htmlBody = """
            <h2>New Mirage Motorworks inquiry</h2>
            <p><strong>Name:</strong> ${cleanName.escapeHtml()}</p>
            <p><strong>Email:</strong> ${cleanEmail.escapeHtml()}</p>
            <p><strong>Subject:</strong> ${cleanSubject.escapeHtml()}</p>
            <p><strong>Message:</strong></p>
            <p>${cleanMessage.escapeHtml().replace("\n", "<br>")}</p>
        """.trimIndent()
        val payload = buildJsonObject {
            put("from", config.emailFrom)
            put("to", config.contactEmailTo)
            put("reply_to", cleanEmail)
            put("subject", "Mirage inquiry: $cleanSubject")
            put("text", textBody)
            put("html", htmlBody)
        }.toString()
        val request = HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
            .header("Authorization", "Bearer $apiKey")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build()
        return runCatching { client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() in 200..299 }.getOrDefault(false)
    }
}

private fun String.escapeHtml(): String =
    replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
