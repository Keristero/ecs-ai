import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '../environment.mjs';
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs';

const docsHtml = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'docs.html'), 'utf8');

const describeInput=(schema)=>{
    const shapeFactory=schema?._def?.shape;
    if(typeof shapeFactory!=='function') return {type:'object'};
    const properties=Object.fromEntries(Object.keys(shapeFactory()).map((key)=>[key,{type:'string'}]));
    return {type:'object',properties,additionalProperties:Object.keys(properties).length?false:true};
};

const addCollection=(spec,defs,basePath)=>{
    const listPath='/' + basePath;
    spec.paths[listPath]={get:{summary:'List '+basePath,responses:{200:{description:'OK'}}}};
    for(const [handle,definition] of Object.entries(defs)){
        const schema=describeInput(definition?.details?.inputSchema);
        const hasPayload=Object.keys(schema.properties??{}).length>0;
        spec.paths[listPath+'/'+handle]={post:{summary:definition?.details?.title??handle,description:definition?.details?.description,requestBody:hasPayload?{required:true,content:{'application/json':{schema}}}:undefined,responses:{200:{description:'Success'},400:{description:'Invalid input payload'},500:{description:'Execution failed'}}}};
    }
};

const generateOpenApiSpec=()=>{
    const spec={openapi:'3.1.0',info:{title:'ECS API',version:'1.0.0',description:'Interact with the ECS game world, MCP resources, and the Ollama agent.'},servers:[{url:'http://'+env.api_host+':'+env.api_port}],components:{schemas:{}},paths:{}};
    spec.paths['/health']={get:{summary:'Health check',responses:{200:{description:'Service is healthy'}}}};
    addCollection(spec,tool_defs,'tools');
    addCollection(spec,resource_defs,'resources');
    spec.paths['/agent/prompt']={post:{summary:'Forward a prompt to the Ollama agent',responses:{200:{description:'Prompt processed successfully'},400:{description:'Invalid prompt payload'},502:{description:'Failed to contact Ollama server'}}}};
    return spec;
};

const setupDocs=(app,{logger}={})=>{
    app.get('/docs/openapi.json',(req,res)=>res.json(generateOpenApiSpec()));
    app.get('/docs',(req,res)=>res.type('html').send(docsHtml));
    logger?.info('API docs available at /docs (OpenAPI spec at /docs/openapi.json)');
    return {getSpec:generateOpenApiSpec};
};

export { setupDocs, generateOpenApiSpec };
