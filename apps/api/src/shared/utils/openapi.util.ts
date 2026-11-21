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

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const ERROR_RESPONSE_SCHEMA_NAME = 'ErrorResponse';
const ERROR_RESPONSE_REF = `#/components/schemas/${ERROR_RESPONSE_SCHEMA_NAME}`;

function forEachOperationResponse(
  document: OpenAPIObject,
  visitor: (statusCode: string, response: NonNullable<ComponentsSchemas[string]> & Record<string, any>) => void,
): void {
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation?.responses) continue;

      for (const [statusCode, response] of Object.entries(operation.responses)) {
        if (!response || '$ref' in response) continue;
        visitor(statusCode, response);
      }
    }
  }
}

/**
 * Bọc `{ data: <schema> }` cho các response 2xx (application/json) trong OpenAPI spec
 * để khớp với TransformInterceptor ở runtime (bỏ qua nếu schema đã có sẵn field `data`).
 */
export function wrapOpenApiSuccessResponses(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas ?? {};

  forEachOperationResponse(document, (statusCode, response) => {
    if (!statusCode.startsWith('2')) return;

    const jsonContent = response.content?.['application/json'];
    if (!jsonContent?.schema) return;

    if (hasDataProperty(jsonContent.schema, schemas)) return;

    jsonContent.schema = {
      type: 'object',
      properties: {
        data: jsonContent.schema,
      },
      required: ['data'],
    };
  });

  return document;
}

/**
 * Gắn schema chuẩn của `HttpExceptionFilter` vào toàn bộ response lỗi (4xx/5xx) chưa có `schema`
 * để các công cụ Contract Testing (như Apidog) không báo "Response này không nên có body".
 */
export function attachOpenApiErrorResponses(document: OpenAPIObject): OpenAPIObject {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas[ERROR_RESPONSE_SCHEMA_NAME] ??= {
    type: 'object',
    properties: {
      statusCode: { type: 'integer', description: 'HTTP status code' },
      message: { type: 'string', description: 'Thông báo lỗi' },
      code: { type: 'string', description: 'Mã lỗi nghiệp vụ (tùy chọn)' },
      errors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Danh sách chi tiết lỗi validation (nếu có)',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Thời điểm phát sinh lỗi (ISO 8601)',
      },
    },
    required: ['statusCode', 'message', 'timestamp'],
    additionalProperties: false,
  };

  forEachOperationResponse(document, (statusCode, response) => {
    if (!statusCode.startsWith('4') && !statusCode.startsWith('5')) return;

    response.content ??= {};
    response.content['application/json'] ??= {};
    response.content['application/json'].schema ??= { $ref: ERROR_RESPONSE_REF };
  });

  return document;
}
