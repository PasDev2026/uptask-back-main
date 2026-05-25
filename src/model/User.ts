import mongoose, {Schema, Document, Types} from "mongoose"
import Role from "./role"

export interface IUser extends Document {
    email?: string
    password: string
    name: string
    apellido_paterno: string
    apellido_materno: string
    telefono: string
    username: string
    dni?: string
    estado: boolean
    confirmed: boolean
    role: Types.ObjectId
    area: Types.ObjectId
    empresas: Types.ObjectId[]
}

const userSchema: Schema = new Schema({
    email: {
        type: String,
        required: false,
        lowercase: true,
        sparse: true
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    apellido_paterno: {
        type: String,
        required: true,
    },
    apellido_materno: {
        type: String,
        required: true,
    },
    telefono: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    dni: {
        type: String,
        required: true,
        unique: true,
        sparse: true
    },
    estado: {
        type: Boolean,
        default: true
    },
    confirmed: {
        type: Boolean,
        default: true
    },
    role: {
        type: Types.ObjectId,
        ref: 'Role',
    },
    area: {
        type: Types.ObjectId,
        ref: 'Area',
    },
    empresas: [
        {
            type: Types.ObjectId,
            ref: 'Empresa',
        }
    ]
})

userSchema.pre('save', async function (next) {
    try {
        if (this.isNew && !this.role) {
            const roleUser = await Role.findOne({ name: 'personal' })

            if (!roleUser) {
                return next(new Error("Rol 'personal' no existe en BD"))
            }

            this.role = roleUser._id
        }

        next()
    } catch (error) {
        next(error)
    }
})

const User = mongoose.model<IUser>('User', userSchema)
export default User