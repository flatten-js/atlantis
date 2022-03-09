const fs = require('fs')
const { Transform } = require('stream')
const { publicEncrypt, privateDecrypt } = require('crypto')

class Crypt extends Transform {
  constructor(key, size) {
    super()
    this.key = fs.readFileSync(key)
    this.chunk_size = size
    this.chunk = Buffer.from([])
  }

  _crypted(chunk) {
    return chunk
  }

  _transform(chunk, encoding, done) {
    const { chunk_size } = this
    chunk = this.chunk = Buffer.concat([this.chunk, chunk])

    if (chunk.length >= chunk_size) {
      while (chunk.length > 0) {
        if (chunk.length < chunk_size) break
        const crypted = this._crypted(chunk.slice(0, chunk_size))
        this.push(crypted)
        chunk = this.chunk = chunk.slice(chunk_size)
      }
    }

    done()
  }

  _final(done) {
    if (this.chunk.length) {
      const crypted = this._crypted(this.chunk)
      this.push(crypted)
    }

    done()
  }
}

class Encrypt extends Crypt {
  constructor(key) {
    super(key, 128)
  }

  _crypted(chunk) {
    return publicEncrypt(this.key, chunk).toString('hex')
  }
}

class Decrypt extends Crypt {
  constructor(key) {
    super(key, 512)
  }

  _crypted(chunk) {
    chunk = Buffer.from(chunk.toString(), 'hex')
    return privateDecrypt(this.key, chunk)
  }
}

exports.Encrypt = Encrypt
exports.Decrypt = Decrypt
