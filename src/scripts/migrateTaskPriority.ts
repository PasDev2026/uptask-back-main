import mongoose from 'mongoose'
import Task from '../model/Task'
import dotenv from 'dotenv'

dotenv.config()

const migrateTaskPriority = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string)
        console.log('Conectado a MongoDB')

        const result = await Task.updateMany(
            { priority: { $exists: false } },
            { $set: { priority: 'medium' } }
        )

        console.log(`Tareas actualizadas con prioridad 'medium': ${result.modifiedCount}`)
        console.log(`Tareas que ya tenían prioridad: tareas totales - modificadas`)

        const totalTasks = await Task.countDocuments()
        console.log(`Total de tareas en la base de datos: ${totalTasks}`)

        console.log('Migración de prioridades completada exitosamente')
        process.exit(0)

    } catch (error) {
        console.error('Error en migración de prioridades:', error)
        process.exit(1)
    }
}

migrateTaskPriority()
