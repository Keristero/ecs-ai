import { defineComponent, Types } from 'bitecs'

export const Position = defineComponent({
    x: Types.f32,
    y: Types.f32
})

export const Health = defineComponent({
    current: Types.i32,
    max: Types.i32
})