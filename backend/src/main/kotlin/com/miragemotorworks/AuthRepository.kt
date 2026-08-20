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
data class PasswordResetDelivery(val email: String, val token: String)

class AuthRepository(private val database: Database) {
    private val random = SecureRandom()

    fun bootstrapAdmin(email: String?, password: String?) {
        if (email == null && password == null) return
        require(email != null && password != null) {
            "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be provided together"
        }
        require(PasswordPolicy.isValid(password)) { "Bootstrap admin password does not meet password requirements" }

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

    fun register(request: RegisterRequest): CreatedSession? {
        val email = request.email.trim().lowercase()
        val name = request.displayName.trim()
        require(email.matches(Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")))
        require(name.length in 2..80)
        require(PasswordPolicy.isValid(request.password))

        val created = database.withConnection { connection ->
            connection.autoCommit = false
            try {
                val id = UUID.randomUUID()
                connection.prepareStatement(
                    "INSERT INTO users (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, 'customer') ON CONFLICT (email) DO NOTHING"
                ).use { statement ->
                    statement.setObject(1, id); statement.setString(2, email); statement.setString(3, name)
                    statement.setString(4, PasswordHasher.hash(request.password))
                    if (statement.executeUpdate() == 0) return@withConnection false
                }
                connection.prepareStatement("INSERT INTO customer_profiles (user_id) VALUES (?)").use {
                    it.setObject(1, id); it.executeUpdate()
                }
                connection.commit(); true
            } catch (exception: Exception) {
                connection.rollback(); throw exception
            } finally { connection.autoCommit = true }
        }
        return if (created) login(email, request.password) else null
    }

    fun profile(userId: String): CustomerProfile? = database.withConnection { connection ->
        connection.prepareStatement(
            """SELECT u.id, u.email, u.display_name, u.role, p.phone, p.preferred_contact, p.marketing_opt_in
            FROM users u LEFT JOIN customer_profiles p ON p.user_id = u.id WHERE u.id = ?::uuid"""
        ).use { statement ->
            statement.setString(1, userId); statement.executeQuery().use { result ->
                if (!result.next()) null else CustomerProfile(
                    AuthUser(result.getString("id"), result.getString("email"), result.getString("display_name"), result.getString("role")),
                    result.getString("phone") ?: "", result.getString("preferred_contact") ?: "email", result.getBoolean("marketing_opt_in")
                )
            }
        }
    }

    fun updateProfile(userId: String, update: ProfileUpdate): CustomerProfile? {
        require(update.displayName.trim().length in 2..80)
        require(update.phone.length <= 40 && update.preferredContact in setOf("email", "phone", "text"))
        database.withConnection { connection ->
            connection.autoCommit = false
            try {
                connection.prepareStatement("UPDATE users SET display_name = ?, updated_at = NOW() WHERE id = ?::uuid").use {
                    it.setString(1, update.displayName.trim()); it.setString(2, userId); it.executeUpdate()
                }
                connection.prepareStatement(
                    """INSERT INTO customer_profiles (user_id, phone, preferred_contact, marketing_opt_in)
                    VALUES (?::uuid, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET
                    phone = EXCLUDED.phone, preferred_contact = EXCLUDED.preferred_contact,
                    marketing_opt_in = EXCLUDED.marketing_opt_in, updated_at = NOW()"""
                ).use { it.setString(1, userId); it.setString(2, update.phone.trim()); it.setString(3, update.preferredContact); it.setBoolean(4, update.marketingOptIn); it.executeUpdate() }
                connection.commit()
            } catch (exception: Exception) { connection.rollback(); throw exception } finally { connection.autoCommit = true }
        }
        return profile(userId)
    }

    fun createPasswordReset(emailInput: String): PasswordResetDelivery? {
        val email = emailInput.trim().lowercase()
        val userId = database.withConnection { connection ->
            connection.prepareStatement("SELECT id FROM users WHERE lower(email) = lower(?)").use { statement ->
                statement.setString(1, email)
                statement.executeQuery().use { if (it.next()) it.getString("id") else null }
            }
        } ?: return null
        val tokenBytes = ByteArray(32).also(random::nextBytes)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes)
        database.withConnection { connection ->
            connection.autoCommit = false
            try {
                connection.prepareStatement("DELETE FROM password_reset_tokens WHERE user_id = ?::uuid OR expires_at <= NOW()").use {
                    it.setString(1, userId); it.executeUpdate()
                }
                connection.prepareStatement("INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?::uuid, ?, ?)").use {
                    it.setObject(1, UUID.randomUUID()); it.setString(2, userId); it.setString(3, tokenHash(token))
                    it.setTimestamp(4, Timestamp.from(Instant.now().plus(30, ChronoUnit.MINUTES))); it.executeUpdate()
                }
                connection.commit()
            } catch (exception: Exception) { connection.rollback(); throw exception } finally { connection.autoCommit = true }
        }
        return PasswordResetDelivery(email, token)
    }

    fun resetPassword(token: String, password: String): Boolean {
        require(PasswordPolicy.isValid(password))
        if (token.isBlank()) return false
        return database.withConnection { connection ->
            connection.autoCommit = false
            try {
                val row = connection.prepareStatement(
                    "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > NOW() FOR UPDATE"
                ).use { statement ->
                    statement.setString(1, tokenHash(token)); statement.executeQuery().use {
                        if (it.next()) Pair(it.getString("id"), it.getString("user_id")) else null
                    }
                } ?: return@withConnection false
                connection.prepareStatement("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?::uuid").use {
                    it.setString(1, PasswordHasher.hash(password)); it.setString(2, row.second); it.executeUpdate()
                }
                connection.prepareStatement("UPDATE password_reset_tokens SET consumed_at = NOW() WHERE id = ?::uuid").use {
                    it.setString(1, row.first); it.executeUpdate()
                }
                connection.prepareStatement("DELETE FROM user_sessions WHERE user_id = ?::uuid").use {
                    it.setString(1, row.second); it.executeUpdate()
                }
                connection.commit(); true
            } catch (exception: Exception) { connection.rollback(); throw exception } finally { connection.autoCommit = true }
        }
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

object PasswordPolicy {
    fun isValid(password: String): Boolean = password.length in 12..128 &&
        password.any(Char::isUpperCase) && password.any(Char::isLowerCase) && password.any(Char::isDigit)
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
