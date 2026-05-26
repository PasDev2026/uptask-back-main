import { createServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import User from './model/User'
import { initSocketServer } from './services/socket.service'
import app from './server'

const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
})

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
        return next(new Error('No autorizado'))
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string }
        const user = await User.findById(decoded.id).select('_id estado')
        if (!user) {
            return next(new Error('Usuario no encontrado'))
        }
        if (!user.estado) {
            return next(new Error('Usuario inactivo'))
        }
        socket.data.userId = user._id.toString()
        next()
    } catch {
        next(new Error('Token no válido'))
    }
})

io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`)
    socket.on('disconnect', () => {
        socket.leave(`user:${socket.data.userId}`)
    })
})

initSocketServer(io)

const port = process.env.PORT || 4000
httpServer.listen(port, () => {
    console.log(`Server on run in port ${port}`)
})
