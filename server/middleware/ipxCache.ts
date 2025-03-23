import { defineEventHandler, sendStream } from 'h3'
import { PassThrough, Writable } from 'stream'
import { promises as fs, existsSync, createReadStream } from 'fs'
import { mkdirSync } from 'fs'
import path from 'path'
import { ServerResponse } from 'http'
import crypto from 'crypto'

// Cache duration constants in seconds
const CACHE_MAX_AGE = 604800 // 7 days
const CACHE_STALE_WHILE_REVALIDATE = 86400 // 1 day

export default defineEventHandler(async event => {
    const cacheDir = path.resolve('./.ipx-cache')
    const reqUrl = event.req.url || ''

    if (!reqUrl.startsWith('/_ipx/')) return

    // Set cache control headers for IPX images
    event.res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`)

    const strippedUrl = reqUrl.replace('/_ipx/', '')
    const cacheFilePath = path.resolve(cacheDir, strippedUrl)
    const hashFilePath = `${cacheFilePath}.hash`

    if (!existsSync(path.dirname(cacheFilePath))) {
        mkdirSync(path.dirname(cacheFilePath), { recursive: true })
    }

    // Remote URLs don't need to be checked against original files
    // Just serve from cache if it exists
    if (existsSync(cacheFilePath)) {
        console.log(`Serving from cache: ${cacheFilePath}`)
        return sendStream(event, createReadStream(cacheFilePath))
    }

    const originalRes = event.res
    const passThrough = new PassThrough()
    const captureStream = new CaptureStream()

    passThrough.pipe(captureStream)

    const originalWrite = originalRes.write.bind(originalRes) as (
        chunk: any,
        encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
        callback?: (error: Error | null | undefined) => void
    ) => boolean

    const originalEnd = originalRes.end.bind(originalRes) as (
        chunk?: any,
        encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
        callback?: () => void
    ) => ServerResponse

    originalRes.write = (
        chunk: any,
        encodingOrCallback?:
            | BufferEncoding
            | ((error: Error | null | undefined) => void),
        callback?: (error: Error | null | undefined) => void
    ): boolean => {
        passThrough.write(chunk, encodingOrCallback as BufferEncoding, callback)
        return originalWrite(
            chunk,
            encodingOrCallback as BufferEncoding,
            callback
        )
    }

    originalRes.end = (
        chunk?: any,
        encodingOrCallback?:
            | BufferEncoding
            | ((error: Error | null | undefined) => void),
        callback?: () => void
    ): ServerResponse => {
        if (chunk)
            passThrough.write(
                chunk,
                encodingOrCallback as BufferEncoding,
                callback
            )

        originalEnd(chunk, encodingOrCallback, callback)

        if (originalRes.statusCode !== 200) return originalRes

        mkdirSync(path.dirname(cacheFilePath), { recursive: true })
        const buffer = captureStream.getBuffer()
        fs.writeFile(cacheFilePath, buffer)
            .then(() => {
                console.log(`Cached image: ${cacheFilePath}`)
            })
            .catch(err => {
                console.error(`Error caching image: ${err}`)
            })
        return originalRes
    }

    return
})

class CaptureStream extends Writable {
    private chunks: Buffer[]

    constructor(options?: any) {
        super(options)
        this.chunks = []
    }

    _write(
        chunk: any,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ): void {
        this.chunks.push(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
        )
        callback()
    }

    getBuffer(): Buffer {
        return Buffer.concat(this.chunks)
    }
}

async function generateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath)
    return generateBufferHash(fileBuffer)
}

function generateBufferHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}
