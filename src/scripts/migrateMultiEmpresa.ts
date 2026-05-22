import mongoose from 'mongoose'
import User from '../model/User'
import Project from '../model/Project'
import dotenv from 'dotenv'

dotenv.config()

const migrateMultiEmpresa = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string)
        console.log('Conectado a MongoDB')

        // 1. Migrar User.empresa → User.empresas (array)
        const usersWithOldField = await User.find({ empresa: { $exists: true } })
        console.log(`Usuarios con campo 'empresa' (singular): ${usersWithOldField.length}`)

        for (const user of usersWithOldField) {
            if (user.get('empresa')) {
                await User.updateOne(
                    { _id: user._id },
                    { $set: { empresas: [user.get('empresa')] }, $unset: { empresa: '' } }
                )
            } else {
                await User.updateOne(
                    { _id: user._id },
                    { $set: { empresas: [] }, $unset: { empresa: '' } }
                )
            }
        }
        console.log('Migración User.empresa → User.empresas completada')

        // 2. Asignar empresas[] a usuarios que no tenían el campo empresa
        const usersWithoutEmpresas = await User.updateMany(
            { empresas: { $exists: false } },
            { $set: { empresas: [] } }
        )
        console.log(`Usuarios sin empresas inicializados: ${usersWithoutEmpresas.modifiedCount}`)

        // 3. Poblar Project.empresa con la empresa del manager
        const projectsWithoutEmpresa = await Project.find({ empresa: { $exists: false } })
        console.log(`Proyectos sin campo 'empresa': ${projectsWithoutEmpresa.length}`)

        for (const project of projectsWithoutEmpresa) {
            const manager = await User.findById(project.manager).select('empresas')
            if (manager && manager.empresas.length > 0) {
                await Project.updateOne(
                    { _id: project._id },
                    { $set: { empresa: manager.empresas[0] } }
                )
                console.log(`  Proyecto "${project.projectName}" → empresa ${manager.empresas[0]}`)
            } else {
                console.log(`  ⚠ Proyecto "${project.projectName}" (manager sin empresa) — saltado`)
            }
        }

        console.log('Migración de proyectos completada')
        console.log('Migración multiempresa completada exitosamente')
        process.exit(0)

    } catch (error) {
        console.error('Error en migración:', error)
        process.exit(1)
    }
}

migrateMultiEmpresa()
