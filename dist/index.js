"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const atlantis_1 = require("./lib/atlantis");
const crypt_1 = require("./lib/crypt");
const prompt_1 = require("./lib/prompt");
const package_json_1 = __importDefault(require("./package.json"));
commander_1.program
    .name('atlantis')
    .description('Encrypted folders that appear only at runtime')
    .version(package_json_1.default.version);
const algorithm_option = (name) => {
    const args = ['-alg, --algorithm <algorithm>', `Algorithm to ${name}`];
    return new commander_1.Option(...args).choices(Object.keys(crypt_1.ALGORITHM)).default(crypt_1.ALGORITHM.AES);
};
commander_1.program
    .command('create')
    .description('Create encrypted folder')
    .addOption(algorithm_option('encrypt'))
    .action(async () => {
    const { algorithm } = commander_1.program.opts();
    const src = await prompt_1.prompt.secret('Please enter your folder to encrypt: ');
    const key = await atlantis_1.atlantis.key(algorithm, true);
    atlantis_1.atlantis.compress(src, algorithm, key);
});
commander_1.program
    .description('Expand encrypted folder')
    .addOption(algorithm_option('decrypt'))
    .action(async () => {
    const { algorithm } = commander_1.program.opts();
    const src = await prompt_1.prompt.secret('Please enter your folder to decrypt: ');
    const key = await atlantis_1.atlantis.key(algorithm);
    atlantis_1.atlantis.uncompress(src, algorithm, key);
});
commander_1.program.parse(process.argv);
