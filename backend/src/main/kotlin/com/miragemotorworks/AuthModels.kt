package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class AuthUser(val id: String, val email: String, val displayName: String, val role: String)

@Serializable
data class AuthResponse(val user: AuthUser)
