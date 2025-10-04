const COLORS = {
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    magenta: '\x1b[35m',
    red: '\x1b[31m',
    yellow: '\x1b[33m'
};

const formatLabel = (label, color) => {
    const code = color && COLORS[color] ? COLORS[color] : null;
    return code ? `${code}${label}\x1b[0m` : label;
};

export default class Logger {
    constructor(label, color = null) {
        this.label = formatLabel(label, color);
    }

    info(...args) {
        console.log(`[${this.label}]`, ...args);
    }

    warn(...args) {
        console.warn(`[${this.label}]`, ...args);
    }

    error(...args) {
        console.error(`[${this.label}]`, ...args);
    }
}