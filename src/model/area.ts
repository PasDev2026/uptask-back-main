import mongoose, { Schema, Document } from "mongoose"

export const areaTypes = {
  TI: 'ti',
  CONTABILIDAD: 'contabilidad',
  FINANZAS: 'finanzas',
  MARKETING: 'marketing',
  TALENTOS: 'talentos',
  OPERACIONES: 'operaciones'
} as const

export type AreaType = typeof areaTypes[keyof typeof areaTypes]

export interface IArea extends Document {
  name: AreaType
}

const areaSchema: Schema = new Schema({
  name: {
    type: String,
    enum: Object.values(areaTypes),
    required: true
  }
})

const Area = mongoose.model<IArea>('Area', areaSchema)
export default Area
