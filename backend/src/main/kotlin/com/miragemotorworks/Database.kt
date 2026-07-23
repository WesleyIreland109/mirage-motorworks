package com.miragemotorworks

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.flywaydb.core.Flyway
import java.sql.Connection

class Database(private val config: AppConfig) {
    val dataSource: HikariDataSource by lazy {
        HikariDataSource(
            HikariConfig().apply {
                jdbcUrl = config.databaseUrl
                username = config.databaseUser
                password = config.databasePassword
                maximumPoolSize = 8
                driverClassName = "org.postgresql.Driver"
            }
        )
    }

    fun migrate() {
        Flyway.configure()
            .dataSource(dataSource)
            .load()
            .migrate()
    }

    fun <T> withConnection(block: (Connection) -> T): T =
        dataSource.connection.use(block)
}
