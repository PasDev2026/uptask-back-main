import jwt from 'jsonwebtoken'
import Types from 'mongoose'

type UserPyload = {
    id: Types.ObjectId
}

export const generateJWT = (payload: UserPyload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }) //video 562
    return token
    //consejo: guardar el token en una cookie,
    //para que el usuario no tenga que volver a ingresar sus datos
    /* reiniciar el servidor */
}