import { query, hasComponent } from 'bitecs'
import System from '../System.mjs'

const sound_system = new System('sound')
sound_system.func = async function ({ game, event }) {
    return null
}

export { sound_system }
