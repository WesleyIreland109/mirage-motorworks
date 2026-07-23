package com.miragemotorworks

import java.sql.ResultSet
import java.util.UUID

class VehicleRepository(private val database: Database) {
    fun list(): List<Vehicle> = database.withConnection { connection ->
        connection.prepareStatement("SELECT * FROM vehicles ORDER BY created_at DESC").use { statement ->
            statement.executeQuery().use { result ->
                buildList {
                    while (result.next()) add(result.toVehicle())
                }
            }
        }
    }

    fun findBySlug(slug: String): Vehicle? = database.withConnection { connection ->
        connection.prepareStatement("SELECT * FROM vehicles WHERE slug = ?").use { statement ->
            statement.setString(1, slug)
            statement.executeQuery().use { result ->
                if (result.next()) result.toVehicle() else null
            }
        }
    }

    fun create(input: VehicleInput): Vehicle = database.withConnection { connection ->
        val id = UUID.randomUUID()
        connection.prepareStatement(
            """
            INSERT INTO vehicles (
                id, slug, year, make, model, trim, status, mileage, exterior_color,
                interior_color, transmission, drivetrain, engine, asking_price,
                invested_amount, projected_profit, days_in_inventory, hero_image,
                gallery, highlights, story, inspection_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            """.trimIndent()
        ).use { statement ->
            statement.bindInput(id.toString(), input, connection.createArrayOf("text", input.gallery.toTypedArray()), connection.createArrayOf("text", input.highlights.toTypedArray()))
            statement.executeQuery().use { result ->
                result.next()
                result.toVehicle()
            }
        }
    }

    fun update(id: String, input: VehicleInput): Vehicle? = database.withConnection { connection ->
        connection.prepareStatement(
            """
            UPDATE vehicles SET
                slug = ?, year = ?, make = ?, model = ?, trim = ?, status = ?,
                mileage = ?, exterior_color = ?, interior_color = ?, transmission = ?,
                drivetrain = ?, engine = ?, asking_price = ?, invested_amount = ?,
                projected_profit = ?, days_in_inventory = ?, hero_image = ?,
                gallery = ?, highlights = ?, story = ?, inspection_notes = ?,
                updated_at = NOW()
            WHERE id = ?
            RETURNING *
            """.trimIndent()
        ).use { statement ->
            statement.setString(1, input.slug)
            statement.setInt(2, input.year)
            statement.setString(3, input.make)
            statement.setString(4, input.model)
            statement.setString(5, input.trim)
            statement.setString(6, input.status)
            statement.setInt(7, input.mileage)
            statement.setString(8, input.exteriorColor)
            statement.setString(9, input.interiorColor)
            statement.setString(10, input.transmission)
            statement.setString(11, input.drivetrain)
            statement.setString(12, input.engine)
            statement.setDouble(13, input.askingPrice)
            statement.setDouble(14, input.investedAmount)
            statement.setDouble(15, input.projectedProfit)
            statement.setInt(16, input.daysInInventory)
            statement.setString(17, input.heroImage)
            statement.setArray(18, connection.createArrayOf("text", input.gallery.toTypedArray()))
            statement.setArray(19, connection.createArrayOf("text", input.highlights.toTypedArray()))
            statement.setString(20, input.story)
            statement.setString(21, input.inspectionNotes)
            statement.setObject(22, UUID.fromString(id))
            statement.executeQuery().use { result ->
                if (result.next()) result.toVehicle() else null
            }
        }
    }

    fun delete(id: String): Boolean = database.withConnection { connection ->
        connection.prepareStatement("DELETE FROM vehicles WHERE id = ?").use { statement ->
            statement.setObject(1, UUID.fromString(id))
            statement.executeUpdate() > 0
        }
    }

    private fun java.sql.PreparedStatement.bindInput(
        id: String,
        input: VehicleInput,
        gallery: java.sql.Array,
        highlights: java.sql.Array
    ) {
        setObject(1, UUID.fromString(id))
        setString(2, input.slug)
        setInt(3, input.year)
        setString(4, input.make)
        setString(5, input.model)
        setString(6, input.trim)
        setString(7, input.status)
        setInt(8, input.mileage)
        setString(9, input.exteriorColor)
        setString(10, input.interiorColor)
        setString(11, input.transmission)
        setString(12, input.drivetrain)
        setString(13, input.engine)
        setDouble(14, input.askingPrice)
        setDouble(15, input.investedAmount)
        setDouble(16, input.projectedProfit)
        setInt(17, input.daysInInventory)
        setString(18, input.heroImage)
        setArray(19, gallery)
        setArray(20, highlights)
        setString(21, input.story)
        setString(22, input.inspectionNotes)
    }
}

private fun ResultSet.toVehicle(): Vehicle =
    Vehicle(
        id = getString("id"),
        slug = getString("slug"),
        year = getInt("year"),
        make = getString("make"),
        model = getString("model"),
        trim = getString("trim"),
        status = getString("status"),
        mileage = getInt("mileage"),
        exteriorColor = getString("exterior_color"),
        interiorColor = getString("interior_color"),
        transmission = getString("transmission"),
        drivetrain = getString("drivetrain"),
        engine = getString("engine"),
        askingPrice = getDouble("asking_price"),
        investedAmount = getDouble("invested_amount"),
        projectedProfit = getDouble("projected_profit"),
        daysInInventory = getInt("days_in_inventory"),
        heroImage = getString("hero_image"),
        gallery = (getArray("gallery").array as Array<*>).map { it.toString() },
        highlights = (getArray("highlights").array as Array<*>).map { it.toString() },
        story = getString("story"),
        inspectionNotes = getString("inspection_notes"),
        createdAt = getTimestamp("created_at").toInstant().toString(),
        updatedAt = getTimestamp("updated_at").toInstant().toString()
    )
