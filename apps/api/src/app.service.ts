import { Injectable } from '@nestjs/common';
import { helloAI } from '@hireflow/ai';

@Injectable()
export class AppService {
  getHello(): string {
    return helloAI();
  }
}
