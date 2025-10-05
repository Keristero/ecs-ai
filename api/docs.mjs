import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import env from '../environment.mjs';
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs';

extendZodWithOpenApi(z);

const docsHtml = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'docs.html'), 'utf8');

const toPascalCase=(value='')=>value
    .replace(/[_-]+/g,' ')
    .split(' ')
    .filter(Boolean)
    .map((part)=>part.charAt(0).toUpperCase()+part.slice(1))
    .join('');

const isSchemaEmptyObject=(schema)=>{
    if(!schema) return true;
    const shapeOrFactory=schema?._def?.shape;
    if(!shapeOrFactory) return false;
    const shape=typeof shapeOrFactory==='function'?shapeOrFactory():shapeOrFactory;
    return shape && typeof shape==='object' && !Array.isArray(shape) && Object.keys(shape).length===0;
};

const createDescribeInput=(registry)=>{
    const registered=new Set();

    return (schema,{ refId })=>{
        if(!schema || isSchemaEmptyObject(schema)){
            return { hasPayload:false };
        }

        const normalizedRefId=refId ?? `Schema${registered.size+1}`;

        if(!registered.has(normalizedRefId)){
            registry.register(normalizedRefId, schema);
            registered.add(normalizedRefId);
        }

        return {
            hasPayload:true,
            schema:{ $ref:`#/components/schemas/${normalizedRefId}` }
        };
    };
};

const addCollection=(spec,defs,basePath,{ registry, describeInput })=>{
    const listPath='/' + basePath;
    spec.paths[listPath]={get:{summary:'List '+basePath,responses:{200:{description:'OK'}}}};
    for(const [handle,definition] of Object.entries(defs)){
        const refId=`${toPascalCase(basePath)}${toPascalCase(handle)}Input`;
        const { hasPayload, schema }=describeInput(definition?.details?.inputSchema,{ refId });
        spec.paths[listPath+'/'+handle]={post:{summary:definition?.details?.title??handle,description:definition?.details?.description,requestBody:hasPayload?{required:true,content:{'application/json':{schema}}}:undefined,responses:{200:{description:'Success'},400:{description:'Invalid input payload'},500:{description:'Execution failed'}}}};
    }
};

const generateOpenApiSpec=()=>{
    const registry=new OpenAPIRegistry();
    const describeInput=createDescribeInput(registry);

    const spec={openapi:'3.1.0',info:{title:'ECS API',version:'1.0.0',description:'Interact with the ECS game world, MCP resources, and the Ollama agent.'},servers:[{url:'http://'+env.api_host+':'+env.api_port}],components:{schemas:{}},paths:{}};
    spec.paths['/health']={get:{summary:'Health check',responses:{200:{description:'Service is healthy'}}}};
    addCollection(spec,tool_defs,'tools',{ registry, describeInput });
    addCollection(spec,resource_defs,'resources',{ registry, describeInput });
    spec.paths['/agent/prompt']={post:{summary:'Forward a prompt to the Ollama agent',responses:{200:{description:'Prompt processed successfully'},400:{description:'Invalid prompt payload'},502:{description:'Failed to contact Ollama server'}}}};

    const generator=new OpenApiGeneratorV31(registry.definitions);
    const generated=generator.generateComponents();
    const schemas=generated?.components?.schemas ?? generated?.schemas ?? {};
    spec.components.schemas={
        ...spec.components.schemas,
        ...schemas
    };
    return spec;
};

const setupDocs=(app,{logger}={})=>{
    app.get('/docs/openapi.json',(req,res)=>res.json(generateOpenApiSpec()));
    app.get('/docs',(req,res)=>res.type('html').send(docsHtml));
    logger?.info('API docs available at /docs (OpenAPI spec at /docs/openapi.json)');
    return {getSpec:generateOpenApiSpec};
};

export { setupDocs, generateOpenApiSpec };
