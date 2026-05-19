import mongoose from 'mongoose'
import Role from '../model/role'
import User from '../model/User'
import dotenv from 'dotenv'

dotenv.config()

const migrateRoles = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string)
        console.log('Conectado a MongoDB')

        // 1. Crear los nuevos roles si no existen
        const newRoles = [
            { name: 'admin' },
            { name: 'ti' },
            { name: 'contabilidad' },
            { name: 'finanzas' },
            { name: 'tesoreria' },
            { name: 'talentos' }
        ]

        for (const roleData of newRoles) {
            const exists = await Role.findOne({ name: roleData.name })
            if (!exists) {
                await Role.create(roleData)
                console.log(`Rol '${roleData.name}' creado`)
            } else {
                console.log(`Rol '${roleData.name}' ya existe`)
            }
        }

        // 2. Obtener el rol 'ti' para migración
        const tiRole = await Role.findOne({ name: 'ti' })
        if (!tiRole) {
            throw new Error("Rol 'ti' no encontrado después de creación")
        }

        // 3. Migrar usuarios con rol 'usuario' al rol 'ti'
        const userRole = await Role.findOne({ name: 'usuario' })
        if (userRole) {
            const updated = await User.updateMany(
                { role: userRole._id },
                { $set: { role: tiRole._id } }
            )
            console.log(`Usuarios migrados de 'usuario' a 'ti': ${updated.modifiedCount}`)
        }

        // 4. Asignar rol 'ti' a usuarios sin rol
        const usersWithoutRole = await User.updateMany(
            { role: { $exists: false } },
            { $set: { role: tiRole._id } }
        )
        console.log(`Usuarios sin rol actualizados a 'ti': ${usersWithoutRole.modifiedCount}`)

        // 5. Eliminar el rol 'usuario' si existe
        if (userRole) {
            await Role.deleteOne({ name: 'usuario' })
            console.log("Rol 'usuario' eliminado")
        }

        console.log('Migración completada exitosamente')
        process.exit(0)

    } catch (error) {
        console.error('Error en migración:', error)
        process.exit(1)
    }
}

migrateRoles()
