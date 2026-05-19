import type { Request, Response } from "express"
import Empresa from "../model/Empresa"

export class EmpresaController {
    static getAllEmpresas = async (req: Request, res: Response) => {
        try {
            const empresas = await Empresa.find().select("_id nombre").lean()
            res.json(empresas)
        } catch (error) {
            res.status(500).json({ error: "Error al obtener las sedes" })
        }
    }

    static createEmpresa = async (req: Request, res: Response) => {
        try {
            const { nombre } = req.body
            const empresaExists = await Empresa.findOne({ nombre })
            if (empresaExists) {
                res.status(400).json({ error: "La sede ya existe" })
                return
            }
            const empresa = new Empresa({ nombre })
            await empresa.save()
            res.status(201).json({ message: "Sede creada correctamente", empresa })
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }
}
