import { Module } from '@nestjs/common';

const sharedServices: any[] = [];

@Module({
  imports: [],
  providers: [...sharedServices],
  exports: [],
})
export class SharedModule {}
