import { Server } from 'socket.io'

let io: Server

export const initSocketServer = (socketIO: Server) => {
    io = socketIO
}

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.IO no ha sido inicializado')
    }
    return io
}
