import Empresa from "../model/Empresa"
import Role from "../model/role"
import Area from "../model/area"
import { roleTypes } from "../model/role"
import { areaTypes } from "../model/area"

const SEDES = ["jesus maria", "golf", "sjm", "hub", "internacional", "operaciones", "talentos", "marketing", "finanzas", "contabilidad", "ti"]

export const seedEmpresas = async () => {
    try {
        for (const nombre of SEDES) {
            await Empresa.findOneAndUpdate(
                { nombre },
                { nombre },
                { upsert: true, new: true }
            )
        }
        console.log("Sedes inicializadas correctamente")
    } catch (error) {
        console.error("Error al inicializar sedes:", error)
    }
}

export const seedRoles = async () => {
    try {
        for (const name of Object.values(roleTypes)) {
            await Role.findOneAndUpdate(
                { name },
                { name },
                { upsert: true, new: true }
            )
        }
        console.log("Roles inicializados correctamente")
    } catch (error) {
        console.error("Error al inicializar roles:", error)
    }
}

export const seedAreas = async () => {
    try {
        for (const name of Object.values(areaTypes)) {
            await Area.findOneAndUpdate(
                { name },
                { name },
                { upsert: true, new: true }
            )
        }
        console.log("Áreas inicializadas correctamente")
    } catch (error) {
        console.error("Error al inicializar áreas:", error)
    }
}
