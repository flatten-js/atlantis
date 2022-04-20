"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = exports.ALGORITHM = void 0;
const fs_1 = __importDefault(require("fs"));
const stream_1 = require("stream");
const crypto_1 = __importDefault(require("crypto"));
const cli_progress_1 = require("cli-progress");
const buffer_xor_1 = __importDefault(require("buffer-xor"));
class Crypt extends stream_1.Transform {
    constructor(key, chunk_size) {
        super();
        this.chunk_size = chunk_size;
        this.key = this.read_key(key);
        this.chunk = Buffer.from([]);
    }
    read_key(key) {
        return fs_1.default.readFileSync(key);
    }
    crypt(chunk) {
        return chunk;
    }
    _transform(chunk, _encoding, done) {
        const { chunk_size } = this;
        chunk = this.chunk = Buffer.concat([this.chunk, chunk]);
        if (chunk.length >= chunk_size) {
            while (chunk.length > 0) {
                if (chunk.length < chunk_size)
                    break;
                const crypted = this.crypt(chunk.slice(0, chunk_size));
                this.push(crypted);
                chunk = this.chunk = chunk.slice(chunk_size);
            }
        }
        done();
    }
    _final(done) {
        if (this.chunk.length) {
            const crypted = this.crypt(this.chunk);
            this.push(crypted);
        }
        done();
    }
}
class Decrypt extends Crypt {
    constructor(key, chunk_size, total) {
        super(key, chunk_size);
        this.progress = new cli_progress_1.SingleBar({}, cli_progress_1.Presets.legacy);
        this.progress.start(total, 0);
        this.total = 0;
    }
    _update(chunk_size) {
        this.progress.update(this.total += chunk_size);
    }
    _final(done) {
        super._final(done);
        this.progress.stop();
        this.total = 0;
    }
}
class RSA {
    constructor(key) {
        this.key = key;
    }
    get Encrypt() {
        return class extends Crypt {
            constructor(key, chunk_size) {
                super(key, chunk_size);
            }
            crypt(chunk) {
                return crypto_1.default.publicEncrypt(this.key, chunk);
            }
        };
    }
    encrypt() {
        return new this.Encrypt(this.key, RSA.ENCRYPT_LENGTH);
    }
    get Decrypt() {
        return class extends Decrypt {
            constructor(key, chunk_size, total) {
                super(key, chunk_size, total);
            }
            read_key(key) {
                try {
                    return fs_1.default.readFileSync(key);
                }
                catch (e) {
                    throw new Error(`[${e.code}] Failed to read private key`);
                }
            }
            crypt(chunk) {
                super._update(chunk.length);
                return crypto_1.default.privateDecrypt(this.key, chunk);
            }
        };
    }
    decrypt(total) {
        return new this.Decrypt(this.key, RSA.DECRYPT_LENGTH, total);
    }
}
RSA.ENCRYPT_LENGTH = 214;
RSA.DECRYPT_LENGTH = 256;
class AES {
    constructor(key) {
        this.key = key;
    }
    get Encrypt() {
        return class extends Crypt {
            constructor(key, chunk_size) {
                super(key, chunk_size);
                this.block = Buffer.from([]);
            }
            read_key(key) {
                try {
                    return fs_1.default.readFileSync(key);
                }
                catch (e) {
                    throw new Error(`[${e.code}] Failed to read common key`);
                }
            }
            crypt(chunk) {
                const iv = this.block.length ? (0, buffer_xor_1.default)(this.block, chunk).slice(0, AES.IV_LENGTH) : crypto_1.default.randomBytes(16);
                const cipher = crypto_1.default.createCipheriv(AES.ALGORITHM, this.key, iv);
                this.block = Buffer.concat([cipher.update(chunk), cipher.final()]);
                return Buffer.concat([iv, this.block]);
            }
        };
    }
    encrypt() {
        return new this.Encrypt(this.key, AES.ENCRYPT_LENGTH - AES.PADDING_LENGTH);
    }
    get Decrypt() {
        return class extends Decrypt {
            constructor(key, chunk_size, total) {
                super(key, chunk_size, total);
            }
            read_key(key) {
                try {
                    return fs_1.default.readFileSync(key);
                }
                catch (e) {
                    throw new Error(`[${e.code}] Failed to read common key`);
                }
            }
            crypt(chunk) {
                super._update(chunk.length);
                const iv = chunk.slice(0, AES.IV_LENGTH);
                const decipher = crypto_1.default.createDecipheriv(AES.ALGORITHM, this.key, iv);
                chunk = decipher.update(chunk.slice(AES.IV_LENGTH));
                return Buffer.concat([chunk, decipher.final()]);
            }
        };
    }
    decrypt(total) {
        return new this.Decrypt(this.key, AES.IV_LENGTH + AES.DECRYPT_LENGTH, total);
    }
}
AES.ALGORITHM = 'aes-256-cbc';
AES.ENCRYPT_LENGTH = 256;
AES.DECRYPT_LENGTH = 256;
AES.PADDING_LENGTH = 1;
AES.IV_LENGTH = 16;
exports.ALGORITHM = { AES: 'AES', RSA: 'RSA' };
const SUPPORT_ALGORITHM = {
    [exports.ALGORITHM.AES]: AES,
    [exports.ALGORITHM.RSA]: RSA
};
const encrypt = (algorithm, key) => (new SUPPORT_ALGORITHM[algorithm](key)).encrypt();
exports.encrypt = encrypt;
const decrypt = (algorithm, key, total) => (new SUPPORT_ALGORITHM[algorithm](key)).decrypt(total);
exports.decrypt = decrypt;
