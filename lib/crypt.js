const fs = require('fs')
const { Transform } = require('stream')
const { publicEncrypt, privateDecrypt } = require('crypto')


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

class Encrypt extends Crypt {
  constructor(key) {
    super(key, 128)
  }

  _crypt(chunk) {
    return publicEncrypt(this.key, chunk)
  }
}

class Decrypt extends Crypt {
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
}

exports.Encrypt = Encrypt
exports.Decrypt = Decrypt
