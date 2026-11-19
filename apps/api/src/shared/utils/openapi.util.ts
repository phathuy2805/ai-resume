import type { OpenAPIObject } from '@nestjs/swagger';

type ComponentsSchemas = NonNullable<
  NonNullable<OpenAPIObject['components']>['schemas']
>;
type SchemaOrRef = ComponentsSchemas[string];

function isReferenceObject(schema: SchemaOrRef): schema is { $ref: string } {
  return '$ref' in schema;
}

function hasDataProperty(
  schema: SchemaOrRef,
  schemas: ComponentsSchemas,
): boolean {
  if (isReferenceObject(schema)) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    const resolved = schemas[refName];
    return resolved ? hasDataProperty(resolved, schemas) : false;
  }

  return Boolean(schema.properties && 'data' in schema.properties);
}

/**
 * Bọc `{ data: <schema> }` cho các response 2xx (application/json) trong OpenAPI spec
 * để khớp với TransformInterceptor ở runtime (bỏ qua nếu schema đã có sẵn field `data`).
 */
export function wrapOpenApiSuccessResponses(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas ?? {};

  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = pathItem[method];
      if (!operation?.responses) continue;

      for (const [statusCode, response] of Object.entries(operation.responses)) {
        if (!statusCode.startsWith('2') || !response || '$ref' in response) continue;

        const jsonContent = response.content?.['application/json'];
        if (!jsonContent?.schema) continue;

        if (hasDataProperty(jsonContent.schema, schemas)) continue;

        jsonContent.schema = {
          type: 'object',
          properties: {
            data: jsonContent.schema,
          },
          required: ['data'],
        };
      }
    }
  }

  return document;
}
