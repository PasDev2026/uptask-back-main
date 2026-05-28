import mongoose, { Schema, Document } from "mongoose"

export interface IEmpresa extends Document {
    nombre: string
}

const empresaSchema: Schema = new Schema({
    nombre: {
        type: String,
        required: true,
        unique: true,
        enum: ["jesus maria", "golf", "sjm", "hub", "operaciones", "talentos", "marketing", "finanzas", "contabilidad", "ti"]
    }
})

const Empresa = mongoose.model<IEmpresa>('Empresa', empresaSchema)
export default Empresa
