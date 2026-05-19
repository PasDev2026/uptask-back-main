import mongoose from 'mongoose'
import Task from '../model/Task'
import dotenv from 'dotenv'

dotenv.config()

const migrateTaskDates = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string)
        console.log('Conectado a MongoDB')

        const tasksWithoutStartDate = await Task.countDocuments({
            startDate: { $exists: false }
        })
        const tasksWithDates = await Task.countDocuments({
            startDate: { $exists: true },
            dueDate: { $exists: true }
        })
        const totalTasks = await Task.countDocuments()

        console.log(`Total de tareas: ${totalTasks}`)
        console.log(`Tareas sin fecha de inicio: ${tasksWithoutStartDate}`)
        console.log(`Tareas con ambas fechas: ${tasksWithDates}`)
        console.log('Migración completada — no se realizaron cambios automáticos')

        process.exit(0)

    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

migrateTaskDates()
