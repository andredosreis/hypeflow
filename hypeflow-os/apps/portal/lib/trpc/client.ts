/**
 * Portal tRPC Client
 *
 * Provides a typed tRPC client for use in 'use client' components.
 */

import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/root'

export const trpc = createTRPCReact<AppRouter>()
