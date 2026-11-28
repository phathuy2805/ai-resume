import { createZodDto } from 'nestjs-zod';
import {
  GetCompanyResSchema,
  UpdateCompanyBodySchema,
  UpdateCompanyResSchema,
} from './company.schema.js';

export class UpdateCompanyBodyDto extends createZodDto(UpdateCompanyBodySchema) {}

export class GetCompanyResDto extends createZodDto(GetCompanyResSchema) {}
export class UpdateCompanyResDto extends createZodDto(UpdateCompanyResSchema) {}
