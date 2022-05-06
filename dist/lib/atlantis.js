"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Atlantis = void 0;
require('dotenv').config();
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const archiver_1 = __importDefault(require("archiver"));
const unzipper_1 = __importDefault(require("unzipper"));
const chokidar_1 = __importDefault(require("chokidar"));
const crypt_1 = require("./crypt");
const prompt_1 = require("./prompt");
const utils_1 = require("./utils");
class Atlantis {
    constructor() {
        this.target = '';
    }
    async key(algorithm, is_compress) {
        switch (algorithm) {
            case crypt_1.ALGORITHM.RSA:
                if (is_compress)
                    return process.env.RSA_PUBLIC_KEY || '';
                return await prompt_1.prompt.secret('Please enter your private key: ');
            case crypt_1.ALGORITHM.AES:
                return await prompt_1.prompt.secret('Please enter your common key: ');
            default:
                return '';
        }
    }
    async compress(src, algorithm, key, to = '../') {
        try {
            const stat = fs_1.default.statSync(src);
            if (!stat.isDirectory())
                throw { code: 'ENOTDIR' };
        }
        catch (e) {
            throw new Error(`[${e.code}] Failed to read folder to encrypt`);
        }
        const dest = path_1.default.join(src, to, (0, crypto_1.randomUUID)());
        const output = fs_1.default.createWriteStream(dest);
        const archive = (0, archiver_1.default)('zip');
        archive.pipe((0, crypt_1.encrypt)(algorithm, key)).pipe(output);
        archive.directory(src, path_1.default.basename(src));
        await archive.finalize();
    }
    async vanish(dest, target, algorithm, key, is_compress) {
        try {
            if (!+is_compress)
                return;
            const src = path_1.default.join(dest, target);
            await this.compress(src, algorithm, key, '../../');
        }
        finally {
            while (fs_1.default.existsSync(dest)) {
                fs_1.default.rmSync(dest, { recursive: true, force: true });
                await (0, utils_1.sleep)(1000);
            }
        }
    }
    async on_update_atlantis(dest) {
        this.target = await (0, utils_1.run)(() => fs_1.default.readdirSync(dest)[0], 100, v => v);
        fs_1.default.copyFileSync('./assets/README.txt', path_1.default.join(dest, 'README.txt'));
        const master = [this.target, 'README.txt'].map(f => fs_1.default.statSync(path_1.default.join(dest, f)).ino);
        const watcher = chokidar_1.default.watch(dest, { depth: 0, alwaysStat: true });
        watcher.on('ready', () => {
            ['add', 'addDir'].forEach(name => {
                watcher.on(name, async (p, stat) => {
                    if (master[0] == stat.ino)
                        this.target = path_1.default.basename(p);
                    if (master.includes(stat.ino))
                        return;
                    await (0, utils_1.run)(() => fs_1.default.renameSync(p, path_1.default.join(dest, this.target, path_1.default.basename(p))), 10);
                });
            });
        });
    }
    async on_exit_signal(dest, algorithm, key) {
        let is_compress = true;
        let timer = null;
        if (process.env.TIMEOUT) {
            const timeout = Number(process.env.TIMEOUT) * 1000;
            timer = setTimeout(async function run() {
                const answer = await prompt_1.prompt.call('Press any key to cancel the timeout', 60);
                if (answer)
                    return timer = setTimeout(run, timeout);
                throw new Error('Call uncaughtException to connect to subsequent processing');
            }, timeout);
        }
        process.on('SIGINT', async () => {
            if (timer)
                clearTimeout(timer);
            is_compress = await prompt_1.prompt.confirm('Do you want to encrypt again?');
            throw new Error('Call uncaughtException to connect to subsequent processing');
        });
        [
            'beforeExit', 'uncaughtException', 'unhandledRejection',
            'SIGHUP', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
            'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
            'SIGUSR2', 'SIGTERM'
        ].forEach(signal => {
            process.on(signal, async (_) => {
                if (crypt_1.ALGORITHM.RSA == algorithm)
                    key = await this.key(algorithm, true);
                const args = [dest, this.target, algorithm, key, String(+is_compress)];
                const options = { detached: true, stdio: 'ignore' };
                const subprocess = (0, child_process_1.spawn)('node', ['./bin/vanish.js', ...args], options);
                subprocess.unref();
                process.exit(0);
            });
        });
    }
    async uncompress(src, algorithm, key) {
        try {
            var stat = fs_1.default.statSync(src);
            if (!stat.isFile())
                throw { code: 'EISDIR' };
        }
        catch (e) {
            throw new Error(`[${e.code}] Failed to read file to decrypt`);
        }
        const dest = path_1.default.join(path_1.default.dirname(src), 'atlantis');
        const input = fs_1.default.createReadStream(src);
        const output = unzipper_1.default.Extract({ path: dest });
        input.pipe((0, crypt_1.decrypt)(algorithm, key, stat.size)).pipe(output);
        this.on_update_atlantis(dest);
        this.on_exit_signal(dest, algorithm, key);
        while (1)
            await (0, utils_1.sleep)(1000);
    }
}
exports.Atlantis = Atlantis;
