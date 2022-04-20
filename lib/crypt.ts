import fs from 'fs'
import { Transform } from 'stream'
import crypto from 'crypto'

import { SingleBar, Presets } from 'cli-progress'
import xor from 'buffer-xor'


class Crypt extends Transform {
  protected key: Buffer
  private chunk: Buffer

  constructor(key: string, private chunk_size: number) {
    super()
    this.key = this.read_key(key)
    this.chunk = Buffer.from([])
  }

  protected read_key(key: string): Buffer {
    return fs.readFileSync(key)
  }

  protected crypt(chunk: Buffer): Buffer {
    return chunk
  }

  _transform(chunk: Buffer, _encoding: string, done: () => void) {
    const { chunk_size } = this
    chunk = this.chunk = Buffer.concat([this.chunk, chunk])

    if (chunk.length >= chunk_size) {
      while (chunk.length > 0) {
        if (chunk.length < chunk_size) break
        const crypted = this.crypt(chunk.slice(0, chunk_size))
        this.push(crypted)
        chunk = this.chunk = chunk.slice(chunk_size)
      }
    }

    done()
  }

  _final(done: () => void) {
    if (this.chunk.length) {
      const crypted = this.crypt(this.chunk)
      this.push(crypted)
    }

    done()
  }
}

class Decrypt extends Crypt {
  private progress: SingleBar
  private total: number

  constructor(key: string, chunk_size: number, total: number) {
    super(key, chunk_size)
    this.progress = new SingleBar({}, Presets.legacy)
    this.progress.start(total, 0)
    this.total = 0
  }

  protected _update(chunk_size: number) {
    this.progress.update(this.total += chunk_size)
  }

  _final(done: () => void) {
    super._final(done)
    this.progress.stop()
    this.total = 0
  }
}

class RSA {
  static ENCRYPT_LENGTH = 214
  static DECRYPT_LENGTH = 256

  constructor(private key: string) {}

  private get Encrypt() {
    return class extends Crypt {
      constructor(key: string, chunk_size: number) {
        super(key, chunk_size)
      }

      protected crypt(chunk: Buffer): Buffer {
        return crypto.publicEncrypt(this.key, chunk)
      }
    }
  }

  encrypt() {
    return new this.Encrypt(this.key, RSA.ENCRYPT_LENGTH)
  }

  private get Decrypt() {
    return class extends Decrypt {
      constructor(key: string, chunk_size: number, total: number) {
        super(key, chunk_size, total)
      }

      protected read_key(key: string): Buffer {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read private key`)
        }
      }

      protected crypt(chunk: Buffer): Buffer {
        super._update(chunk.length)
        return crypto.privateDecrypt(this.key, chunk)
      }
    }
  }

  decrypt(total: number) {
    return new this.Decrypt(this.key, RSA.DECRYPT_LENGTH, total)
  }
}

class AES {
  static ALGORITHM = 'aes-256-cbc'
  static ENCRYPT_LENGTH = 256
  static DECRYPT_LENGTH = 256
  static PADDING_LENGTH = 1
  static IV_LENGTH = 16

  constructor(private key: string) {}

  private get Encrypt() {
    return class extends Crypt {
      private block: Buffer

      constructor(key: string, chunk_size: number) {
        super(key, chunk_size)
        this.block = Buffer.from([])
      }

      protected read_key(key: string): Buffer {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read common key`)
        }
      }

      protected crypt(chunk: Buffer): Buffer {
        const iv = this.block.length ? xor(this.block, chunk).slice(0, AES.IV_LENGTH) : crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(AES.ALGORITHM, this.key, iv)
        this.block = Buffer.concat([cipher.update(chunk), cipher.final()])
        return Buffer.concat([iv, this.block])
      }
    }
  }

  encrypt() {
    return new this.Encrypt(this.key, AES.ENCRYPT_LENGTH - AES.PADDING_LENGTH)
  }

  private get Decrypt() {
    return class extends Decrypt {
      constructor(key: string, chunk_size: number, total: number) {
        super(key, chunk_size, total)
      }

      protected read_key(key: string): Buffer {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read common key`)
        }
      }

      protected crypt(chunk: Buffer): Buffer {
        super._update(chunk.length)
        const iv = chunk.slice(0, AES.IV_LENGTH)
        const decipher = crypto.createDecipheriv(AES.ALGORITHM, this.key, iv)
        chunk = decipher.update(chunk.slice(AES.IV_LENGTH))
        return Buffer.concat([chunk, decipher.final()])
      }
    }
  }

  decrypt(total: number) {
    return new this.Decrypt(this.key, AES.IV_LENGTH + AES.DECRYPT_LENGTH, total)
  }
}

export const ALGORITHM = { AES: 'AES', RSA: 'RSA' } as const
export type ALGORITHM = typeof ALGORITHM[keyof typeof ALGORITHM]

const SUPPORT_ALGORITHM = {
  [ALGORITHM.AES]: AES,
  [ALGORITHM.RSA]: RSA
}

export const encrypt = (algorithm: ALGORITHM, key: string) => (new SUPPORT_ALGORITHM[algorithm](key)).encrypt()
export const decrypt = (algorithm: ALGORITHM, key: string, total: number) => (new SUPPORT_ALGORITHM[algorithm](key)).decrypt(total)
