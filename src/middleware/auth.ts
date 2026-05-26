import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import User, { IUser } from '../model/User'
import Role from '../model/role'

declare global {
    namespace Express {
        interface Request {
            user?: IUser
        }
    }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization
    if(!bearer){
        const error = new Error('No autorizado')
        res.status(401).json({error: error.message})
        return
    }

    const token = bearer.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if(typeof decoded === 'object' && decoded.id){
            const user = await User.findById(decoded.id).select('_id name email empresas estado')
            if(user){
                if(!user.estado){
                    res.status(401).json({error: 'Usuario inactivo'})
                    return
                }
                req.user = user
                next()
            }else{
                res.status(500).json({error: 'Token no válido'})
                return
            }
        }
    } catch (error) {
        res.status(401).json({error: 'Token no válido'})
        return
    }

}

export const authorizeRole = (roleNames: string | string[]) => {
    const rolesArray = Array.isArray(roleNames) ? roleNames : [roleNames]

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await User.findById(req.user.id).populate('role')
            const role = user.role as any

            if (!rolesArray.includes(role.name)) {
                const error = new Error('Acceso denegado')
                res.status(403).json({ error: error.message })
                return
            }

            next()
        } catch (error) {
            res.status(500).json({ error: 'Error al verificar permisos' })
            return
        }
    }
}

