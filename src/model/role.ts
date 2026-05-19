import mongoose, { Schema, Document } from "mongoose"

export const roleTypes = {
  ADMIN: 'admin',
  TI: 'ti',
  CONTABILIDAD: 'contabilidad',
  FINANZAS: 'finanzas',
  TESORERIA: 'tesoreria',
  TALENTOS: 'talentos'
} as const

export type RoleType = typeof roleTypes[keyof typeof roleTypes]


export interface IRole extends Document {
  name: RoleType
}

const roleSchema: Schema = new Schema({
  name: {
    type: String,
    enum: Object.values(roleTypes),
    default: roleTypes.TI,
    required: true
  }
})

const Role = mongoose.model<IRole>('Role', roleSchema)
export default Role