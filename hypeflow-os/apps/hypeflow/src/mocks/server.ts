import { setupServer } from 'msw/node'
import { anthropicHandlers } from './handlers/anthropic'

export const server = setupServer(...anthropicHandlers)
