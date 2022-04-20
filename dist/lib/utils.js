"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.sleep = void 0;
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const run = (cb, ms, validator) => {
    return new Promise(resolve => {
        setTimeout(async function run() {
            try {
                const data = await cb();
                if (validator && !validator(data))
                    throw {};
                return resolve(data);
            }
            catch {
                setTimeout(run, ms);
            }
        }, 0);
    });
};
exports.run = run;
