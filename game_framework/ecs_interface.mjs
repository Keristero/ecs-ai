import { addEntity, addComponent, query, set } from 'bitecs'
import { z } from "zod";

const tool_defs = {}
const resource_defs = {}

//helpers
function get_component_by_name(game,component_name){
    //Helper to get a component by name from the game world, with descriptive exceptions.
    if(!game.world || !game.world.components){
        throw new Error("Game world or components not initialized")
    }
    const comp = game.world.components[component_name]
    if(!comp){
        throw new Error(`Component '${component_name}' not found in game world components`)
    }
    return comp
}

function construct_tool_run_function(func){
    //Reduce duplication when defining tool run functions, returns descriptive messages.
    return async(inputs)=>{
        let response_message = ""
        try{
            response_message = await func(inputs)
        }catch(e){
            response_message = `Error: ${e.message}`
        }finally{
            return {
                content: [{ type: "text", text: response_message }]
            }
        }
    }
}



//reusable types
const eid = z.number().int().nonnegative().describe("Entity ID")
const component_name = z.string().describe("Name of the component to add")
const component_values = z.array(z.object({
    prop_name: z.string().describe("Component property name"),
    prop_value: z.number().describe("Component property value")
})).describe("Array of {prop_name, prop_value} entries to set on the component")

//tools
tool_defs.addEntity = {
    details: {
        title: "Add Entity",
        description: "Add a new entity to the game world",
        inputSchema: z.object({})
    },
    run: construct_tool_run_function(async({game})=>{
        const eid = addEntity(game.world)
        return `Added entity with ID ${eid}`
    })
}

tool_defs.addComponent = {
    details: {
        title: "Add Component",
        description: "Add a component to an entity",
        inputSchema: z.object({eid,component_name})
    },
    run: construct_tool_run_function(async({game,eid,component_name})=>{
        const component = get_component_by_name(game,component_name)
        addComponent(game.world, eid, component)
        return `Added component '${component_name}' to entity ${eid}`
    })
}

tool_defs.addComponentWithValues = {
    details: {
        title: "Add Component With Values",
        description: "Add a component to an entity with specific values",
        inputSchema: z.object({eid,component_name,component_values})
    },
    run: construct_tool_run_function(async({game,eid,component_name,component_values})=>{
        const component = get_component_by_name(game,component_name)

        // Convert array of {prop_name, prop_value} into an object mapping
        const values = {}
        (component_values ?? []).forEach(({prop_name, prop_value})=>{
            if(typeof prop_name === 'string'){
                values[prop_name] = prop_value
            }
        })

        addComponent(game.world, eid, set(component, values))

        return `Added component '${component_name}' with values ${JSON.stringify(values)} to entity ${eid}`
    })
}

tool_defs.listComponents = {
    details: {
        title: "List Components",
        description: "List all available components in the game world with their properties",
        inputSchema: z.object({})
    },
    run: construct_tool_run_function(async({game})=>{
        if(!game.world || !game.world.components){
            throw new Error("Game world or components not initialized")
        }
        const componentNames = Object.keys(game.world.components)
        if(componentNames.length === 0){
            return "No components registered in the game world"
        }
        
        const componentDetails = componentNames.map(name => {
            const component = game.world.components[name]
            const properties = Object.keys(component).filter(key => Array.isArray(component[key]))
            return `${name}: [${properties.join(", ")}]`
        })
        
        return `Available components:\n${componentDetails.join("\n")}`
    })
}

tool_defs.queryEntitiesWithComponents = {
    details: {
        title: "Query Entities With Components",
        description: "Query entities that have all of the specified components",
        inputSchema: z.object({
            component_names: z.array(component_name).describe("List of component names to query for")
        })
    },
    run: construct_tool_run_function(async({game,component_names})=>{
        const components = component_names.map(name=>get_component_by_name(game,name))
        const eids = query(game.world, components)
        return `Entities with components [${component_names.join(", ")}]: ${Array.from(eids).join(", ")}`
    })
}

//resources

export {
    tool_defs,
    resource_defs
}