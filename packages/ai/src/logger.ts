/**
 * Logger tối thiểu mà @hireflow/ai cần.
 * `console` và `Logger` của NestJS đều có sẵn các hàm này,
 * nên BE truyền thẳng `new Logger('AI')` vào được, không cần adapter.
 */
export interface AiLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug?(message: string): void;
}

/** Logger mặc định khi BE không truyền vào. */
export const consoleLogger: AiLogger = console;
