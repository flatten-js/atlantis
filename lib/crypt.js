const fs = require('fs')
const { Transform } = require('stream')
const {
  publicEncrypt,
  privateDecrypt,
  randomBytes,
  createCipheriv,
  createDecipheriv
} = require('crypto')

const { SingleBar, Presets } = require('cli-progress')
const xor = require('buffer-xor')

const { _enum } = require('./utils.js')


class Crypt extends Transform {
  constructor(key, size) {
    super()
    this.key = this._read_key(key)
    this.chunk_size = size
    this.chunk = Buffer.from([])
  }

  _read_key(key) {
    return fs.readFileSync(key)
  }

  _crypt(chunk) {
    return chunk
  }

  _transform(chunk, encoding, done) {
    const { chunk_size } = this
    chunk = this.chunk = Buffer.concat([this.chunk, chunk])

    if (chunk.length >= chunk_size) {
      while (chunk.length > 0) {
        if (chunk.length < chunk_size) break
        const crypted = this._crypt(chunk.slice(0, chunk_size))
        this.push(crypted)
        chunk = this.chunk = chunk.slice(chunk_size)
      }
    }

    done()
  }

  _final(done) {
    if (this.chunk.length) {
      const crypted = this._crypt(this.chunk)
      this.push(crypted)
    }

    done()
  }
}

class Decrypt extends Crypt {
  constructor(key, size, total) {
    super(key, size)
    this.progress = new SingleBar({}, Presets.legacy)
    this.progress.start(total)
    this.total = 0
  }

  _update(size) {
    this.progress.update(this.total += size)
  }

  _final(done) {
    super._final(done)
    this.progress.stop()
    this.total = 0
  }
}

class RSA {
  static ENCRYPT_LENGTH = 214
  static DECRYPT_LENGTH = 256

  constructor(key) {
    this.key = key
  }

  get _Encrypt() {
    return class extends Crypt {
      constructor(key, size) {
        super(key, size)
      }

      _crypt(chunk) {
        return publicEncrypt(this.key, chunk)
      }
    }
  }

  get encrypt() {
    return new this._Encrypt(this.key, RSA.ENCRYPT_LENGTH)
  }

  get _Decrypt() {
    return class extends Decrypt {
      constructor(key, size, total) {
        super(key, size, total)
      }

      _read_key(key) {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read private key`)
        }
      }

      _crypt(chunk) {
        super._update(chunk.length)
        return privateDecrypt(this.key, chunk)
      }
    }
  }

  decrypt(total) {
    return new this._Decrypt(this.key, RSA.DECRYPT_LENGTH, total)
  }
}

class AES {
  static ALGORITHM = 'aes-256-cbc'
  static ENCRYPT_LENGTH = 256
  static DECRYPT_LENGTH = 256
  static PADDING_LENGTH = 1
  static IV_LENGTH = 16

  constructor(key) {
    this.key = key
  }

  get _Encrypt() {
    return class extends Crypt {
      constructor(key, size) {
        super(key, size)
        this.block = Buffer.from([])
      }

      _read_key(key) {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read common key`)
        }
      }

      _crypt(chunk) {
        const iv = this.block.length ? xor(this.block, chunk).slice(0, AES.IV_LENGTH) : randomBytes(16)
        const cipher = createCipheriv(AES.ALGORITHM, this.key, iv)
        this.block = Buffer.concat([cipher.update(chunk), cipher.final()])
        return Buffer.concat([iv, this.block])
      }
    }
  }

  get encrypt() {
    return new this._Encrypt(this.key, AES.ENCRYPT_LENGTH - AES.PADDING_LENGTH)
  }

  get _Decrypt() {
    return class extends Decrypt {
      constructor(key, size, total) {
        super(key, size, total)
      }

      _read_key(key) {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read common key`)
        }
      }

      _crypt(chunk) {
        super._update(chunk.length)
        const iv = chunk.slice(0, AES.IV_LENGTH)
        const decipher = createDecipheriv(AES.ALGORITHM, this.key, iv)
        chunk = decipher.update(chunk.slice(AES.IV_LENGTH))
        return Buffer.concat([chunk, decipher.final()])
      }
    }
  }

  decrypt(total) {
    return new this._Decrypt(this.key, AES.IV_LENGTH + AES.DECRYPT_LENGTH, total)
  }
}

const ALGORITHM = _enum(['AES', 'RSA'])
const SUPPORT_ALGORITHM = {
  [ALGORITHM.RSA]: RSA,
  [ALGORITHM.AES]: AES
}

exports.ALGORITHM = ALGORITHM
exports.encrypt = (key, algorithm) => (new SUPPORT_ALGORITHM[algorithm](key)).encrypt
exports.decrypt = (key, algorithm, total) => (new SUPPORT_ALGORITHM[algorithm](key)).decrypt(total)
