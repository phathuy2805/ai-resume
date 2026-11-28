import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { NotificationListener } from './notification.listener.js';
import { NotificationRepository } from './notification.repository.js';

@Global()
@Module({
  providers: [MailService, NotificationRepository, NotificationListener],
  exports: [MailService],
})
export class NotificationModule {}
