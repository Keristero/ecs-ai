import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs';
import env from '../environment.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsHtml = readFileSync(path.join(__dirname, 'docs.html'), 'utf8');

const generateSwaggerSpec = () => {
    const spec = {
        openapi: '3.0.0',
        info: {
            title: 'ECS API',
            version: '1.0.0',
            description: 'REST API for ECS game tools and resources'
        },
        servers: [{
            url: `http://${env.api_host}:${env.api_port}`,
            description: 'Local development server'
        }],
        paths: {}
    };

    // Health endpoint
    spec.paths['/health'] = {
        get: {
            summary: 'Health check',
            responses: {
                200: {
                    description: 'Service is healthy',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: { type: 'string', example: 'ok' }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    // Add tools endpoints
    addCollectionPaths(spec, tool_defs, 'tools');
    addCollectionPaths(spec, resource_defs, 'resources');

    return spec;
};

// Response schemas (reusable)
const responses = {
    success: {
        200: {
            description: 'Success',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            handle: { type: 'string' },
                            result: { type: 'string' }
                        }
                    }
                }
            }
        }
    },
    error: {
        400: {
            description: 'Invalid input',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            details: { type: 'object' }
                        }
                    }
                }
            }
        },
        500: {
            description: 'Execution failed',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

const addCollectionPaths = (spec, defs, basePath) => {
    // List endpoint
    spec.paths[`/${basePath}`] = {
        get: {
            summary: `List all ${basePath}`,
            responses: {
                200: {
                    description: `List of available ${basePath}`,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    [basePath]: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                handle: { type: 'string' },
                                                title: { type: 'string' },
                                                description: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    // Execution endpoints
    for (const [handle, definition] of Object.entries(defs)) {
        spec.paths[`/${basePath}/${handle}`] = {
            post: {
                summary: definition?.details?.title || `Execute ${handle}`,
                description: definition?.details?.description || `Execute the ${handle} ${basePath.slice(0, -1)}`,
                requestBody: {
                    content: {
                        'application/json': {
                            schema: zodToSwaggerSchema(definition?.details?.inputSchema)
                        }
                    }
                },
                responses: { ...responses.success, ...responses.error }
            }
        };
    }
};

// Zod to OpenAPI schema converter
const zodToSwaggerSchema = (() => {
    const cache = new WeakMap();
    
    const isOptional = (schema) => 
        schema._def?.typeName === 'ZodOptional' || 
        schema.isOptional?.() ||
        schema._def?.typeName === 'ZodDefault';

    const extractDescription = (schema) => {
        const def = schema._def || schema.def;
        return def?.description || def?.innerType?._def?.description;
    };

    const convertSchema = (schema) => {
        if (!schema?.def && !schema?._def) return { type: 'object' };

        const def = schema._def || schema.def;
        const typeName = def.typeName || (def.type ? `Zod${def.type.charAt(0).toUpperCase() + def.type.slice(1)}` : null);
        
        const typeConverters = {
            ZodString: () => ({ type: 'string' }),
            ZodNumber: () => ({ type: 'number' }),
            ZodInt: () => ({ type: 'integer' }),
            ZodBoolean: () => ({ type: 'boolean' }),
            ZodDate: () => ({ type: 'string', format: 'date-time' }),
            ZodArray: (def) => ({ type: 'array', items: convertSchema(def.type) }),
            ZodRecord: (def) => ({ type: 'object', additionalProperties: def.valueType ? convertSchema(def.valueType) : { type: 'number' } }),
            ZodOptional: (def) => convertSchema(def.innerType),
            ZodObject: (def) => {
                const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
                if (!shape) return { type: 'object' };
                
                const properties = {};
                const required = [];
                
                for (const [key, fieldSchema] of Object.entries(shape)) {
                    properties[key] = convertSchema(fieldSchema);
                    if (!isOptional(fieldSchema)) required.push(key);
                }
                
                return { type: 'object', properties, ...(required.length && { required }) };
            }
        };

        const converter = typeConverters[typeName] || (() => ({ type: 'object' }));
        const baseSchema = converter(def);
        const description = extractDescription(schema);

        return { ...baseSchema, ...(description && { description }) };
    };

    return (zodSchema) => {
        if (!zodSchema) return { type: 'object' };
        if (cache.has(zodSchema)) return cache.get(zodSchema);
        
        const result = convertSchema(zodSchema);
        cache.set(zodSchema, result);
        return result;
    };
})();

const setupDocs = (app, { logger } = {}) => {
    // Serve OpenAPI JSON spec
    app.get('/docs/openapi.json', (req, res) => {
        res.json(generateSwaggerSpec());
    });

    // Serve Swagger UI using the docs.html file
    app.get('/docs', (req, res) => {
        res.type('html').send(docsHtml);
    });

    if (logger) {
        logger.info('API docs available at /docs');
    }
};

export { setupDocs, generateSwaggerSpec };