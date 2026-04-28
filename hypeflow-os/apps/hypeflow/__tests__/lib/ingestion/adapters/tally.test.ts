import { describe, it, expect } from 'vitest'
import { tallyAdapter } from '@/lib/ingestion/adapters/tally'

const CTX = { clientId: '11111111-1111-1111-1111-111111111111', rawText: '' }

type TestField = { key?: string; label?: string; type?: string; value?: unknown }
type ValidPayload = {
  eventId: string
  eventType: string
  createdAt: string
  data: {
    responseId?: string
    formId: string
    formName: string
    createdAt: string
    fields: TestField[]
  }
}

const validPayload = (
  overrides: Partial<{ eventType: string; fields: TestField[] }> = {},
): ValidPayload => ({
  eventId: 'evt-1',
  eventType: overrides.eventType ?? 'FORM_RESPONSE',
  createdAt: '2026-04-28T10:00:00.000Z',
  data: {
    responseId: 'resp-1',
    formId: 'form-1',
    formName: 'Lead Capture',
    createdAt: '2026-04-28T10:00:00.000Z',
    fields: overrides.fields ?? [
      { key: 'q1', label: 'Email', type: 'INPUT_EMAIL', value: 'jane@example.com' },
      { key: 'q2', label: 'Phone', type: 'INPUT_PHONE_NUMBER', value: '+351912345678' },
      { key: 'q3', label: 'Your name', type: 'INPUT_TEXT', value: 'Jane Doe' },
    ],
  },
})

describe('tallyAdapter.parse', () => {
  it('extracts email/phone/name from typed and labelled fields', async () => {
    const out = await tallyAdapter.parse(validPayload(), CTX)
    if ('skip' in out) throw new Error('expected DTO, got skip')
    expect(out.contact.email).toBe('jane@example.com')
    expect(out.contact.phone).toBe('+351912345678')
    expect(out.contact.name).toBe('Jane Doe')
    expect(out.source.platform).toBe('form')
    expect(out.provider).toBe('tally')
    expect(out.event_id).toBe('tally:resp-1')
    expect(out.metadata).toMatchObject({
      tally_form_id: 'form-1',
      tally_form_name: 'Lead Capture',
      tally_event_id: 'evt-1',
    })
  })

  it('falls back to first INPUT_TEXT when no label hint matches', async () => {
    const out = await tallyAdapter.parse(
      validPayload({
        fields: [
          { key: 'q1', label: 'Company', type: 'INPUT_TEXT', value: 'Acme Inc.' },
          { key: 'q2', label: 'Email', type: 'INPUT_EMAIL', value: 'a@b.com' },
        ],
      }),
      CTX,
    )
    if ('skip' in out) throw new Error('expected DTO')
    // First text field becomes the "name" — known limitation, documented in story.
    expect(out.contact.name).toBe('Acme Inc.')
    expect(out.contact.email).toBe('a@b.com')
  })

  it('matches name by Portuguese label "Nome"', async () => {
    const out = await tallyAdapter.parse(
      validPayload({
        fields: [
          { key: 'q1', label: 'Empresa', type: 'INPUT_TEXT', value: 'Acme' },
          { key: 'q2', label: 'Nome completo', type: 'INPUT_TEXT', value: 'João Silva' },
          { key: 'q3', label: 'Email', type: 'INPUT_EMAIL', value: 'j@s.pt' },
        ],
      }),
      CTX,
    )
    if ('skip' in out) throw new Error('expected DTO')
    expect(out.contact.name).toBe('João Silva')
  })

  it('skips events that are not FORM_RESPONSE', async () => {
    const out = await tallyAdapter.parse(
      validPayload({ eventType: 'FORM_VIEW' }),
      CTX,
    )
    expect('skip' in out).toBe(true)
    if ('skip' in out) expect(out.reason).toContain('FORM_VIEW')
  })

  it('throws when no contact info is recoverable', async () => {
    await expect(
      tallyAdapter.parse(
        validPayload({
          fields: [
            { key: 'q1', label: 'Rating', type: 'INPUT_NUMBER', value: 5 },
            { key: 'q2', label: 'Agree', type: 'CHECKBOXES', value: ['yes'] },
          ],
        }),
        CTX,
      ),
    ).rejects.toThrow(/no contact info/)
  })

  it('throws when fields array is empty', async () => {
    await expect(
      tallyAdapter.parse(validPayload({ fields: [] }), CTX),
    ).rejects.toThrow(/empty fields/)
  })

  it('throws when eventType is missing', async () => {
    await expect(
      tallyAdapter.parse({ data: { fields: [] } } as never, CTX),
    ).rejects.toThrow(/missing eventType/)
  })

  it('extracts UTM from hidden fields by key', async () => {
    const out = await tallyAdapter.parse(
      validPayload({
        fields: [
          { key: 'utm_source', label: 'utm_source', type: 'HIDDEN_FIELDS', value: 'google' },
          { key: 'utm_medium', label: 'utm_medium', type: 'HIDDEN_FIELDS', value: 'cpc' },
          { key: 'q1', label: 'Email', type: 'INPUT_EMAIL', value: 'x@y.com' },
        ],
      }),
      CTX,
    )
    if ('skip' in out) throw new Error('expected DTO')
    expect(out.utm).toMatchObject({ source: 'google', medium: 'cpc' })
  })

  it('falls back to generated event_id when responseId is absent', async () => {
    const payload = validPayload()
    delete (payload.data as { responseId?: unknown }).responseId
    const out = await tallyAdapter.parse(payload, CTX)
    if ('skip' in out) throw new Error('expected DTO')
    expect(out.event_id).toMatch(/^sha256:/)
  })
})
