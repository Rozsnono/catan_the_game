import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose'

const HexCoordSchema = new Schema(
  {
    q: { type: Number, required: true },
    r: { type: Number, required: true },
  },
  { _id: false }
)

const TemplatePortSchema = new Schema(
  {
    q: { type: Number, required: true },
    r: { type: Number, required: true },
    edge: { type: Number, required: true }, // 0..5
    kind: { type: String, required: true }, // 'threeToOne' | resource
  },
  { _id: false }
)

const MapTemplateSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    hexes: { type: [HexCoordSchema], default: [] },
    ports: { type: [TemplatePortSchema], default: [] },
  },
  { timestamps: true }
)

export type MapTemplateDoc = HydratedDocument<InferSchemaType<typeof MapTemplateSchema>>

export const MapTemplate: Model<InferSchemaType<typeof MapTemplateSchema>> =
  mongoose.models.MapTemplate || mongoose.model('MapTemplate', MapTemplateSchema)
