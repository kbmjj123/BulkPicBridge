// utils/logger.ts

const isDebug = import.meta.env.WXT_CONSOLE_LOG === 'true'

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'log'

export function createLogger(prefix: string) {
  const tag = `[BulkPic:${prefix}]`

  const noop = () => {}

  const make = (level: LogLevel) =>
    isDebug
      ? console[level].bind(console, `%c${tag}`, 'color:#6366f1;font-weight:bold;')
      : noop

  return {
    log:   make('log'),
    info:  make('info'),
    warn:  make('warn'),   // warn/error 建议始终保留，见下方说明
    error: make('error'),
    debug: make('debug'),
  }
}