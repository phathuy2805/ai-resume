import type { OpenAPIObject } from '@nestjs/swagger';
import { describe, expect, it } from 'vitest';
import {
  attachOpenApiErrorResponses,
  wrapOpenApiSuccessResponses,
} from './openapi.util.js';

function createBaseDocument(responses: Record<string, unknown>): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0' },
    paths: {
      '/api/auth/register': {
        post: {
          responses,
        },
      },
    },
    components: {
      schemas: {},
    },
  } as unknown as OpenAPIObject;
}

describe('openapi.util', () => {
  it('attaches ErrorResponse schema to 4xx/5xx responses missing content or schema while preserving examples', () => {
    const doc = createBaseDocument({
      '400': { description: 'Dữ liệu đầu vào không hợp lệ' },
      '409': {
        description: 'Xung đột',
        content: {
          'application/json': {
            examples: {
              ALREADY_APPLIED: { value: { statusCode: 409, message: 'Already applied' } },
            },
          },
        },
      },
      '500': {
        description: 'Custom error',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    });

    attachOpenApiErrorResponses(doc);

    expect(doc.components?.schemas?.ErrorResponse).toMatchObject({
      type: 'object',
      required: ['statusCode', 'message', 'timestamp'],
      additionalProperties: false,
    });

    const post = doc.paths['/api/auth/register'].post;
    expect(post).toBeDefined();
    const responses = post!.responses as Record<string, any>;
    expect(responses['400'].content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/ErrorResponse',
    });
    expect(responses['409'].content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/ErrorResponse',
    });
    expect(responses['409'].content['application/json'].examples).toHaveProperty('ALREADY_APPLIED');
    expect(responses['500'].content['application/json'].schema).toEqual({ type: 'object' });
  });

  it('wraps 2xx responses without data property into { data }', () => {
    const doc = createBaseDocument({
      '201': {
        description: 'Created',
        content: {
          'application/json': {
            schema: { type: 'string' },
          },
        },
      },
    });

    wrapOpenApiSuccessResponses(doc);

    const post = doc.paths['/api/auth/register'].post;
    expect(post).toBeDefined();
    const res201 = (post!.responses as Record<string, any>)['201'];
    expect(res201.content['application/json'].schema).toEqual({
      type: 'object',
      properties: { data: { type: 'string' } },
      required: ['data'],
    });
  });
});
