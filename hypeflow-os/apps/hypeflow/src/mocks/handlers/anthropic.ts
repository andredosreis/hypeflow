import { http, HttpResponse } from 'msw'

export const anthropicHandlers = [
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_mock',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Mock Anthropic response' }],
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    })
  }),
]

export const anthropicErrorHandler = http.post(
  'https://api.anthropic.com/v1/messages',
  () => new HttpResponse(null, { status: 502 }),
)
