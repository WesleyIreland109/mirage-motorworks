package com.miragemotorworks

import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.sql.Timestamp
import java.util.Base64
import java.util.UUID
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

data class CreatedSession(val token: String, val user: AuthUser)

class AuthRepository(private val database: Database) {
    private val random = SecureRandom()

    fun bootstrapAdmin(email: String?, password: String?) {
        if (email == null && password == null) return
        require(email != null && password != null) {
            "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be provided together"
        }
        require(password.length >= 12) { "Bootstrap admin password must be at least 12 characters" }

        database.withConnection { connection ->
            connection.prepareStatement("SELECT COUNT(*) FROM users").use { statement ->
                statement.executeQuery().use { result ->
                    result.next()
                    if (result.getInt(1) > 0) return@withConnection
                }
            }
            connection.prepareStatement(
                "INSERT INTO users (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')"
            ).use { statement ->
                statement.setObject(1, UUID.randomUUID())
                statement.setString(2, email)
                statement.setString(3, email.substringBefore('@'))
                statement.setString(4, PasswordHasher.hash(password))
                statement.executeUpdate()
            }
        }
    }

    fun login(email: String, password: String): CreatedSession? {
        val record = database.withConnection { connection ->
            connection.prepareStatement(
                "SELECT id, email, display_name, password_hash, role FROM users WHERE lower(email) = lower(?)"
            ).use { statement ->
                statement.setString(1, email.trim())
                statement.executeQuery().use { result ->
                    if (!result.next()) null else Pair(
                        AuthUser(result.getString("id"), result.getString("email"), result.getString("display_name"), result.getString("role")),
                        result.getString("password_hash")
                    )
                }
            }
        } ?: return null

        if (!PasswordHasher.verify(password, record.second)) return null
        val tokenBytes = ByteArray(32).also(random::nextBytes)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes)
        database.withConnection { connection ->
            connection.prepareStatement(
                "INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?::uuid, ?, ?)"
            ).use { statement ->
                statement.setObject(1, UUID.randomUUID())
                statement.setString(2, record.first.id)
                statement.setString(3, tokenHash(token))
                statement.setTimestamp(4, Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS)))
                statement.executeUpdate()
            }
        }
        return CreatedSession(token, record.first)
    }

    fun findUserByToken(token: String?): AuthUser? {
        if (token.isNullOrBlank()) return null
        return database.withConnection { connection ->
            connection.prepareStatement(
                """
                SELECT u.id, u.email, u.display_name, u.role
                FROM user_sessions s JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = ? AND s.expires_at > NOW()
                """.trimIndent()
            ).use { statement ->
                statement.setString(1, tokenHash(token))
                statement.executeQuery().use { result ->
                    if (!result.next()) null else AuthUser(
                        result.getString("id"), result.getString("email"), result.getString("display_name"), result.getString("role")
                    )
                }
            }
        }
    }

    fun logout(token: String?) {
        if (token.isNullOrBlank()) return
        database.withConnection { connection ->
            connection.prepareStatement("DELETE FROM user_sessions WHERE token_hash = ?").use { statement ->
                statement.setString(1, tokenHash(token))
                statement.executeUpdate()
            }
        }
    }

    private fun tokenHash(token: String): String = MessageDigest.getInstance("SHA-256")
        .digest(token.toByteArray())
        .joinToString("") { "%02x".format(it) }
}

private object PasswordHasher {
    private const val iterations = 600_000
    private const val keyLength = 256

    fun hash(password: String): String {
        val salt = ByteArray(16).also(SecureRandom()::nextBytes)
        val hash = derive(password, salt, iterations)
        return "pbkdf2_sha256\$$iterations\$${Base64.getEncoder().encodeToString(salt)}\$${Base64.getEncoder().encodeToString(hash)}"
    }

    fun verify(password: String, encoded: String): Boolean {
        val parts = encoded.split('$')
        if (parts.size != 4 || parts[0] != "pbkdf2_sha256") return false
        val rounds = parts[1].toIntOrNull() ?: return false
        val salt = runCatching { Base64.getDecoder().decode(parts[2]) }.getOrNull() ?: return false
        val expected = runCatching { Base64.getDecoder().decode(parts[3]) }.getOrNull() ?: return false
        return MessageDigest.isEqual(expected, derive(password, salt, rounds))
    }

    private fun derive(password: String, salt: ByteArray, rounds: Int): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, rounds, keyLength)
        return try {
            SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }
}
