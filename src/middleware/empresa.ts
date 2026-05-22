import type {Request, Response, NextFunction} from 'express'

export function belongsToEmpresa(req: Request, res: Response, next: NextFunction) {
    const userEmpresas = req.user.empresas.map(e => e.toString())
    if (!userEmpresas.includes(req.project.empresa.toString())) {
        res.status(403).json({ error: 'No perteneces a la empresa del proyecto' })
        return
    }
    next()
}
