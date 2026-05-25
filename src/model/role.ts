import mongoose, { Schema, Document } from "mongoose"

export const roleTypes = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  PERSONAL: 'personal'
} as const

export type RoleType = typeof roleTypes[keyof typeof roleTypes]


export interface IRole extends Document {
  name: RoleType
}

const roleSchema: Schema = new Schema({
  name: {
    type: String,
    enum: Object.values(roleTypes),
    default: roleTypes.PERSONAL,
    required: true
  }
})

const Role = mongoose.model<IRole>('Role', roleSchema)
export default Role