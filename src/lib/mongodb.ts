import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined
}

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment')
}

let cached = global.mongooseConn
if (!cached) cached = global.mongooseConn = { conn: null, promise: null }

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached!.conn) return cached!.conn
  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI as string)
  }
  cached!.conn = await cached!.promise
  return cached!.conn
}
