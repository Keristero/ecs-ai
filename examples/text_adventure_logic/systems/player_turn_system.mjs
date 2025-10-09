import { hasComponent } from 'bitecs'
import System from '../System.mjs'

const player_turn_system = new System('player_turn')
player_turn_system.func = async function ({ game, event }) {
  return null
}

export { player_turn_system }