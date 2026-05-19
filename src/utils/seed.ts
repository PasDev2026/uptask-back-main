import Empresa from "../model/Empresa"

const SEDES = ["jesus maria", "golf", "sjm"]

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
