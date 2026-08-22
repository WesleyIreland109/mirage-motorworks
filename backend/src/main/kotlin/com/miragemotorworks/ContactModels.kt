package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable
data class ContactInquiryRequest(
    val name: String,
    val email: String,
    val subject: String,
    val message: String
)

@Serializable
data class ContactInquiryResponse(val message: String)
