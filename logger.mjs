export default class Logger{
    constructor(label,color=null){
        let color_prefix = ''
        this.label = color ? `\x1b[36m${label}\x1b[0m` : label
    }
    info(...args){
        console.log(`[${this.label}]`,...args)
    }
}