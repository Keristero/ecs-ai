import { query } from 'bitecs'
import System from '../System.mjs'

const turn_system = new System('turn_system')
turn_system.func = async function ({ game, event }) {
    return null
}

export { turn_system }
