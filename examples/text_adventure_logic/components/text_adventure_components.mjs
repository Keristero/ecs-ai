

// Basic components
const Hitpoints = {
    max: [],
    current: []
}

const Name = {
    stringIndex: [],
}

const Description = {
    stringIndex: [],
}

const Attributes = {
    strength: [],
    dexterity: [],
    intelligence: [],
}

// Game-specific components
const Enemy = {}

const Room = {
    id: [], // unique room id
}

const Item = {
    id: [], // unique item id
}

const Landmark = {
    id: [], // unique landmark id
}

const Player = {
    id: [], // unique player id
    respawnRoom: [], // room id to respawn in
}

// Connections between rooms (directional)
const Connection = {
    from: [], // room id
    to: [],   // room id
    direction: [], // e.g. 'north', 'south', etc.
}

export {
    Hitpoints,
    Name,
    Description,
    Attributes,
    Enemy,
    Room,
    Item,
    Landmark,
    Player,
    Connection
}