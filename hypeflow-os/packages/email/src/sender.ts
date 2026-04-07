/**
 * Email sender via Resend
 *
 * Usage:
 *   import { sendEmail } from '@hypeflow/email'
 *   await sendEmail({ to, subject, html })
 */

interface SendEmailOptions {
  to:      string | string[]
  subject: string
  html:    string
  from?:   string
  replyTo?: string
}

interface ResendResponse {
  id: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ sent: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = options.from ?? process.env.EMAIL_FROM ?? 'HYPE Flow <noreply@hypeflow.pt>'

  if (!apiKey) {
    // Preview mode — log instead of sending
    console.log(`[email] PREVIEW — To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
    console.log(`[email] Subject: ${options.subject}`)
    return { sent: false }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to:       options.to,
        subject:  options.subject,
        html:     options.html,
        reply_to: options.replyTo,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', err)
      return { sent: false, error: err }
    }

    const data: ResendResponse = await res.json()
    return { sent: true, id: data.id }
  } catch (err) {
    console.error('[email] Exception:', err)
    return { sent: false, error: String(err) }
  }
}
