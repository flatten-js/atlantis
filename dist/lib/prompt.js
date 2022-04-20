"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prompt = void 0;
const readline_1 = __importDefault(require("readline"));
const read_1 = __importDefault(require("read"));
class Prompt {
    constructor() { }
    async prompt(message) {
        const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
        return new Promise(resolve => rl.question(message, (answer) => { rl.close(); resolve(answer); }));
    }
    async input(message) {
        return await this.prompt(message);
    }
    async secret(message) {
        return new Promise(resolve => (0, read_1.default)({ prompt: message, silent: true }, (_, input) => resolve(input)));
    }
    async confirm(message) {
        message = message.trim() + ' (Y/n) ';
        const answer = await this.prompt(message);
        return !(answer && /^no?/i.test(answer));
    }
    async call(message, limit) {
        message = message.trim();
        limit = Math.round(limit);
        return new Promise(resolve => {
            let pass = true;
            const data_handler = () => pass || finish(timer, true);
            const write = (limit) => {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(`${message} (${limit}) `);
            };
            const finish = (timer, flag) => {
                clearTimeout(timer);
                process.stdin.pause();
                process.stdin.setRawMode(false);
                process.stdin.removeListener('data', data_handler);
                process.stdout.write(`${flag}\n`);
                return resolve(flag);
            };
            let timer = setTimeout(function run() {
                if (limit < 0)
                    return finish(timer, false);
                write(limit--);
                timer = setTimeout(run, 1000);
            }, 0);
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', data_handler);
            setTimeout(() => pass = false, 100);
        });
    }
}
exports.prompt = new Prompt();
