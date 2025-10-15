import { hasComponent } from 'bitecs'
import System from '../System.mjs'
import { create_event, EVENT_NAMES, EVENT_TYPES } from '../EventQueue.mjs'

const ai_narrator_system = new System('ai_narrator_system', 15) // Low priority - run after other systems
ai_narrator_system.event_whitelist = [EVENT_NAMES.LOOK,EVENT_NAMES.PICKUP,EVENT_NAMES.EQUIP] // Watch for all events

ai_narrator_system.func = async function ({ game, event }) {
    // Only process successful action events by players
    if (event.type !== EVENT_TYPES.ACTION || !event.details?.success) {
        return null
    }

    const actor_eid = event.details?.actor_eid
    if (!actor_eid || !hasComponent(game.world, actor_eid, game.world.components.Player)) {
        return null
    }

    try {
        const prompt = `This event just happened in the game:
${JSON.stringify(event)}
Give a short narration of what transpired in one sentence:"`
        
        const narrative = await prompt_endpoint(prompt, {
            systemPrompt: "You are a concise narrator for a text adventure game. Respond with only atmospheric descriptions",
            think: false
        })
        
        if (narrative) {
            return create_event(
                'ai_narrative',
                narrative.trim(),
                EVENT_TYPES.SYSTEM,
                {
                    actor_eid,
                    source_event: event.name
                }
            )
        }
        
    } catch (error) {
        console.error('AI narrative failed:', error.message)
    }
    
    return null
}

// Configure AI narrator endpoint
const prompt_endpoint = async function(prompt, options = {}) {
    const payload = { prompt }
    
    if (options.systemPrompt) payload.systemPrompt = options.systemPrompt
    if (options.think !== undefined) payload.think = options.think
    
    const response = await fetch('http://127.0.0.1:6060/agent/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
        throw new Error(`AI prompt request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Extract the narrative text from the Ollama response
    // The server returns the Ollama response in the body
    if (data.message?.content) {
        return data.message.content
    } else if (data.content) {
        return data.content
    } else if (typeof data === 'string') {
        return data
    }
    
    // Fallback - return the whole response as string if we can't find expected fields
    return JSON.stringify(data)
}

export { ai_narrator_system }