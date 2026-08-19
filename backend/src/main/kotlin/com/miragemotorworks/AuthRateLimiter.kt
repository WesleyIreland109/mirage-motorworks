package com.miragemotorworks

import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

class AuthRateLimiter(
    private val maximumAttempts: Int = 10,
    private val windowSeconds: Long = 15 * 60
) {
    private data class Window(val startedAt: Instant, val count: Int)
    private val attempts = ConcurrentHashMap<String, Window>()

    fun allow(key: String): Boolean {
        val now = Instant.now()
        val updated = attempts.compute(key) { _, previous ->
            if (previous == null || previous.startedAt.plusSeconds(windowSeconds).isBefore(now)) Window(now, 1)
            else previous.copy(count = previous.count + 1)
        }!!
        return updated.count <= maximumAttempts
    }

    fun reset(key: String) { attempts.remove(key) }
}
