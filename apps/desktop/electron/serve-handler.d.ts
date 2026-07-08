declare module 'serve-handler' {
  import type { IncomingMessage, ServerResponse } from 'node:http'

  type ServeHandlerOptions = {
    public: string
    rewrites?: Array<{ source: string; destination: string }>
  }

  export default function serveHandler(
    request: IncomingMessage,
    response: ServerResponse,
    options: ServeHandlerOptions
  ): Promise<void>
}
