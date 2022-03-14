const fs = require('fs')
const { Transform } = require('stream')
const {
  publicEncrypt,
  privateDecrypt,
  randomBytes,
  createCipheriv,
  createDecipheriv
} = require('crypto')

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

class RSA {
  constructor(key) {
    this.key = key
  }

  get encrypt() {
    return new (class extends Crypt {
      constructor(key) {
        super(key, 214)
      }

      _crypt(chunk) {
        return publicEncrypt(this.key, chunk)
      }
    })(this.key)
  }

  get decrypt() {
    return new (class extends Crypt {
      constructor(key) {
        super(key, 256)
      }

      _read_key(key) {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read private key`)
        }
      }

      _crypt(chunk) {
        return privateDecrypt(this.key, chunk)
      }
    })(this.key)
  }
}

class AES {
  static ALGORITHM = 'aes-256-cbc'
  static PADDING_LENGTH = 1
  static IV_LENGTH = 16

  constructor(key) {
    this.key = key
  }

  get encrypt() {
    return new (class extends Crypt {
      constructor(key) {
        super(key, 256 - AES.PADDING_LENGTH)
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
    })(this.key)
  }

  get decrypt() {
    return new (class extends Crypt {
      constructor(key) {
        super(key, AES.IV_LENGTH + 256)
      }

      _read_key(key) {
        try {
          return fs.readFileSync(key)
        } catch (e) {
          throw new Error(`[${e.code}] Failed to read common key`)
        }
      }

      _crypt(chunk) {
        const iv = chunk.slice(0, AES.IV_LENGTH)
        const decipher = createDecipheriv(AES.ALGORITHM, this.key, iv)
        chunk = decipher.update(chunk.slice(AES.IV_LENGTH))
        return Buffer.concat([chunk, decipher.final()])
      }
    })(this.key)
  }
}

const ALGORITHM = _enum(['AES', 'RSA'])
const SUPPORT_ALGORITHM = {
  [ALGORITHM.RSA]: RSA,
  [ALGORITHM.AES]: AES
}

exports.ALGORITHM = ALGORITHM
exports.encrypt = (key, algorithm) => (new SUPPORT_ALGORITHM[algorithm](key)).encrypt
exports.decrypt = (key, algorithm) => (new SUPPORT_ALGORITHM[algorithm](key)).decrypt
