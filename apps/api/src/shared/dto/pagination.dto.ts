import { createZodDto } from 'nestjs-zod';
import {
  PaginationMetaSchema,
  PaginationQuerySchema,
} from '../models/pagination.model.js';

export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) {}
export class PaginationMetaDto extends createZodDto(PaginationMetaSchema) {}
