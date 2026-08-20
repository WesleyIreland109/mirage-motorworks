package com.miragemotorworks

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PasswordPolicyTest {
    @Test
    fun acceptsCommonSymbols() {
        assertTrue(PasswordPolicy.isValid("Mirage!@#\$%^&*2026"))
    }

    @Test
    fun rejectsShortOrIncompletePasswords() {
        assertFalse(PasswordPolicy.isValid("Short1!"))
        assertFalse(PasswordPolicy.isValid("alllowercase123!"))
        assertFalse(PasswordPolicy.isValid("NOLOWERCASE123!"))
        assertFalse(PasswordPolicy.isValid("NoDigitsHere!"))
    }
}
