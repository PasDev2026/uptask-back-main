import { transporter } from "../config/nodemailer"
import User from "../model/User"

interface IEmail {
    email: string,
    name: string,
    token: string
}


export class AuthEmail {
    static sendConfirmationEmail = async(user: IEmail) => {
        const info = await transporter.sendMail({
            from: 'UpTask <admin@uptask.com>',
            to: user.email,
            subject: 'Uptask - Confirma tu cuenta',
            text: 'Uptask - Confirma tu cuenta',
            html: `<p>Hola: ${user.name}, has creado tu cuenta en Uptask, ya casi está todo listo, solo debes confirmar tu cuenta</p>
            <p>Visita el siguiente enlace: 
            <a href="${process.env.FRONTEND_URL}/auth/confirm-account">Confirmar Cuenta</a></p>
            <p>Ingresa el código: <b>${user.token}</b></p>
            <p>Este token expira en  10 minutos</p>
            `
        })
        console.log('Mensaje enviado', info.messageId);
    }

    //enviar nueva contrasena
    static sendPasswordResetToken = async(user: IEmail) => {
        const info = await transporter.sendMail({
            from: 'UpTask <admin@uptask.com>',
            to: user.email,
            subject: 'Uptask - Reestablece tu password',
            text: 'Uptask - Confirma tu cuenta',
            html: `<p>Hola: ${user.name}, has solicitado un reestablecimiento de tu password</p>
            <p>Visita el siguiente enlace: 
            <a href="${process.env.FRONTEND_URL}/auth/new-password">Reestablecer Contraseña</a></p>
            <p>Ingresa el código: <b>${user.token}</b></p>
            <p>Este token expira en  10 minutos</p>
            `
        })
        console.log('Mensaje enviado', info.messageId);
    }

}
