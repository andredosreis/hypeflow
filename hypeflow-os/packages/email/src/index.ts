/**
 * HYPE Flow OS — Email Package
 *
 * Provides typed email sending via Resend.
 * All templates return { subject, html } — the caller sends via Resend API.
 */

export * from './templates/call-reminder'
export * from './templates/lead-notification'
export * from './templates/welcome'
export * from './templates/follow-up'
export * from './sender'
