const fs = require('fs')
const path = require('path')
const { randomUUID, publicEncrypt, privateDecrypt } = require('crypto')
const { Transform } = require('stream')

const { program } = require('commander')
const archiver = require('archiver')
const unzipper = require('unzipper')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

class Crypto extends Transform {
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

class Encrypto extends Crypto {
  constructor(key) {
    super(key, 128)
  }

  _crypted(chunk) {
    return publicEncrypt(this.key, chunk).toString('hex')
  }
}

class Decrypto extends Crypto {
  constructor(key) {
    super(key, 512)
  }

  _crypted(chunk) {
    chunk = Buffer.from(chunk.toString(), 'hex')
    return privateDecrypt(this.key, chunk)
  }
}

program
  .command('new')
  .argument('<src>')
  .argument('<key>')
  .action(async (src, key) => {
    const dest = path.join(src, '../', randomUUID())
    const output = fs.createWriteStream(dest)
    const archive = archiver('zip')
    archive.pipe(new Encrypto(key)).pipe(output)
    archive.glob(path.join(src, '**/*'))
    await archive.finalize()
  })

program
  .argument('<src>')
  .argument('<key>')
  .action(async (src, key) => {
    const dest = './atlantis'
    const input = fs.createReadStream(src)
    const output = unzipper.Extract({ path: dest })
    input.pipe(new Decrypto(key)).pipe(output)

    process.on('exit', () => fs.rmSync(dest, { recursive: true, force: true }))
    process.on('SIGINT', () => process.exit(0))

    while (1) await sleep(1000)
  })

program.parse()
