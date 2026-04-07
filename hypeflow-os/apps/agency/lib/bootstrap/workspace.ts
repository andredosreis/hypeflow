import { createClient, createServiceClient } from '@/lib/supabase/server'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

const DEFAULT_STAGES = [
  { name: 'Nova', position: 0, color: '#21A0C4', is_terminal: false, is_won: false },
  { name: 'Qualificando', position: 1, color: '#F5A623', is_terminal: false, is_won: false },
  { name: 'Agendada', position: 2, color: '#4FC8EA', is_terminal: false, is_won: false },
  { name: 'Proposta', position: 3, color: '#D1FF00', is_terminal: false, is_won: false },
  { name: 'Fechada', position: 4, color: '#00E5A0', is_terminal: true, is_won: true },
]

export async function ensureWorkspaceForCurrentUser() {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    && process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  if (!hasSupabase) {
    return { user: null, agencyId: 'demo-agency-id', clientId: 'preview-client-1' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const service = await createServiceClient()
    const demoSlug = 'demo-workspace'

    let agencyId: string
    const { data: demoAgency } = await service
      .from('agencies')
      .select('id')
      .eq('slug', demoSlug)
      .maybeSingle()

    if (demoAgency?.id) {
      agencyId = demoAgency.id
    } else {
      agencyId = crypto.randomUUID()
      await service.from('agencies').insert({
        id: agencyId,
        name: 'Demo Workspace',
        slug: demoSlug,
        logo_url: null,
        plan: 'starter',
        settings: {},
      })
    }

    const { data: demoClient } = await service
      .from('clients')
      .select('id')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let clientId = demoClient?.id ?? null
    if (!clientId) {
      clientId = crypto.randomUUID()
      await service.from('clients').insert({
        id: clientId,
        agency_id: agencyId,
        account_manager_id: null,
        name: 'Cliente Demo Performance',
        slug: `cliente-demo-${clientId.slice(0, 6)}`,
        niche: 'Servicos B2B',
        logo_url: null,
        website: null,
        primary_email: 'demo@hypeflow.local',
        primary_phone: null,
        billing_email: 'demo@hypeflow.local',
        mrr: 3200,
        contract_start: new Date().toISOString().slice(0, 10),
        contract_end: null,
        status: 'active',
        health_score: 82,
        monthly_lead_target: 120,
        settings: {},
      })
    }

    const { data: existingStages } = await service
      .from('pipeline_stages')
      .select('id')
      .eq('agency_id', agencyId)
      .limit(1)

    if (!existingStages?.length) {
      await service.from('pipeline_stages').insert(
        DEFAULT_STAGES.map((stage) => ({
          id: crypto.randomUUID(),
          agency_id: agencyId,
          pipeline_id: null,
          name: stage.name,
          position: stage.position,
          color: stage.color,
          sla_hours: stage.is_terminal ? null : 48,
          automation_rules: [],
          is_terminal: stage.is_terminal,
          is_won: stage.is_won,
        }))
      )
    }

    const { count: leadCount } = await service
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)

    if (!leadCount || leadCount === 0) {
      const { data: stages } = await service
        .from('pipeline_stages')
        .select('id')
        .eq('agency_id', agencyId)
        .order('position', { ascending: true })

      const stageIds = (stages ?? []).map((s) => s.id)
      const leads = ['Joao Martins', 'Ana Costa', 'Carlos Silva', 'Sofia Nunes', 'Miguel Rocha']
      await service.from('leads').insert(
        leads.map((name, idx) => ({
          id: crypto.randomUUID(),
          agency_id: agencyId,
          client_id: clientId,
          agent_id: null,
          pipeline_stage_id: stageIds[Math.min(idx, stageIds.length - 1)] ?? null,
          full_name: name,
          email: `demo${idx + 1}@hypeflow.local`,
          phone: null,
          company: null,
          source: idx % 2 === 0 ? 'meta' : 'google_ads',
          source_type: 'paid',
          campaign_id: null,
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          referral_source: null,
          status: 'new',
          score: 65 + idx * 6,
          temperature: idx % 3 === 0 ? 'hot' : 'warm',
          tags: [],
          notes: null,
          lost_reason: null,
          stage_entered_at: new Date().toISOString(),
          last_contact_at: null,
          first_contact_at: new Date().toISOString(),
        }))
      )
    }

    const { count: trafficCount } = await service
      .from('traffic_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .eq('source_type', 'paid')

    if (!trafficCount || trafficCount === 0) {
      const rows: Array<Record<string, unknown>> = []
      for (let i = 29; i >= 0; i -= 1) {
        const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10)
        const spendMeta = 20 + (i % 5) * 3
        const leadsMeta = 5 + (i % 4)
        const spendGoogle = 14 + (i % 4) * 2
        const leadsGoogle = 4 + (i % 3)
        rows.push(
          {
            id: crypto.randomUUID(),
            agency_id: agencyId,
            client_id: clientId,
            integration_id: null,
            campaign_id: null,
            date,
            platform: 'meta',
            source_type: 'paid',
            impressions: 1300 + i * 10,
            clicks: 88 + (i % 10),
            leads: leadsMeta,
            conversions: 1,
            spend: spendMeta,
            ctr: 0.06,
            cpl: spendMeta / leadsMeta,
            roas: null,
            platform_metrics: {},
          },
          {
            id: crypto.randomUUID(),
            agency_id: agencyId,
            client_id: clientId,
            integration_id: null,
            campaign_id: null,
            date,
            platform: 'google_ads',
            source_type: 'paid',
            impressions: 900 + i * 7,
            clicks: 70 + (i % 8),
            leads: leadsGoogle,
            conversions: 1,
            spend: spendGoogle,
            ctr: 0.07,
            cpl: spendGoogle / leadsGoogle,
            roas: null,
            platform_metrics: {},
          }
        )
      }
      await service.from('traffic_metrics').insert(rows)
    }

    return { user: null, agencyId, clientId }
  }

  const service = await createServiceClient()

  let agencyId: string | null = null
  const { data: existingProfile } = await service
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile?.agency_id) {
    agencyId = existingProfile.agency_id
  } else {
    agencyId = crypto.randomUUID()
    const seed = user.email?.split('@')[0] ?? 'agency'
    const slug = `${slugify(seed || 'agency')}-${agencyId.slice(0, 6)}`

    await service.from('agencies').insert({
      id: agencyId,
      name: `Agencia ${seed}`,
      slug,
      logo_url: null,
      plan: 'starter',
      settings: {},
    })

    await service.from('users').upsert({
      id: user.id,
      agency_id: agencyId,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? seed,
      email: user.email ?? `${slug}@hypeflow.local`,
      role: 'owner',
      avatar_url: null,
      is_active: true,
      last_login: new Date().toISOString(),
    })
  }

  const { data: existingClients } = await service
    .from('clients')
    .select('id, name, niche')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true })

  let clientId = existingClients?.[0]?.id ?? null
  if (!clientId) {
    clientId = crypto.randomUUID()
    await service.from('clients').insert({
      id: clientId,
      agency_id: agencyId,
      account_manager_id: user.id,
      name: 'Cliente Demo Performance',
      slug: `cliente-demo-${clientId.slice(0, 6)}`,
      niche: 'Servicos B2B',
      logo_url: null,
      website: null,
      primary_email: user.email ?? null,
      primary_phone: null,
      billing_email: user.email ?? null,
      mrr: 3200,
      contract_start: new Date().toISOString().slice(0, 10),
      contract_end: null,
      status: 'active',
      health_score: 82,
      monthly_lead_target: 120,
      settings: {},
    })
  }

  const { data: stages } = await service
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('agency_id', agencyId)
    .order('position', { ascending: true })

  let pipelineStages = stages ?? []
  if (!pipelineStages.length) {
    const rows = DEFAULT_STAGES.map((stage) => ({
      id: crypto.randomUUID(),
      agency_id: agencyId,
      pipeline_id: null,
      name: stage.name,
      position: stage.position,
      color: stage.color,
      sla_hours: stage.is_terminal ? null : 48,
      automation_rules: [],
      is_terminal: stage.is_terminal,
      is_won: stage.is_won,
    }))

    await service.from('pipeline_stages').insert(rows)
    pipelineStages = rows.map((r) => ({ id: r.id, name: r.name, position: r.position }))
  }

  const { count: leadCount } = await service
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)

  if (!leadCount || leadCount === 0) {
    const now = Date.now()
    const stageIds = pipelineStages.map((s) => s.id)
    const names = ['Joao Martins', 'Ana Costa', 'Carlos Silva', 'Sofia Nunes', 'Miguel Rocha', 'Rita Gomes']
    const sources = ['meta', 'google_ads', 'instagram', 'linkedin', 'organic', 'whatsapp']
    const temperatures: Array<'cold' | 'warm' | 'hot'> = ['hot', 'warm', 'warm', 'hot', 'cold', 'warm']

    const rows = names.map((name, idx) => {
      const createdAt = new Date(now - idx * 5 * 3600_000).toISOString()
      const stageId = stageIds[Math.min(idx, stageIds.length - 1)] ?? null
      return {
        id: crypto.randomUUID(),
        agency_id: agencyId,
        client_id: clientId,
        agent_id: user.id,
        pipeline_stage_id: stageId,
        full_name: name,
        email: `lead${idx + 1}@exemplo.com`,
        phone: null,
        company: null,
        source: sources[idx] ?? 'meta',
        source_type: (sources[idx] === 'organic' ? 'organic' : 'paid'),
        campaign_id: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
        referral_source: null,
        status: 'new',
        score: 60 + idx * 5,
        temperature: temperatures[idx] ?? 'warm',
        tags: [],
        notes: null,
        lost_reason: null,
        stage_entered_at: createdAt,
        last_contact_at: null,
        first_contact_at: createdAt,
      }
    })

    await service.from('leads').insert(rows)
  }

  const { count: trafficCount } = await service
    .from('traffic_metrics')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .eq('source_type', 'paid')

  if (!trafficCount || trafficCount === 0) {
    const days = 30
    const rows: Array<Record<string, unknown>> = []
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10)
      const spendMeta = 18 + (i % 7) * 2
      const leadsMeta = 6 + (i % 5)
      const spendGoogle = 14 + (i % 6) * 2
      const leadsGoogle = 4 + (i % 4)

      rows.push(
        {
          id: crypto.randomUUID(),
          agency_id: agencyId,
          client_id: clientId,
          integration_id: null,
          campaign_id: null,
          date,
          platform: 'meta',
          source_type: 'paid',
          impressions: 1500 + i * 11,
          clicks: 90 + (i % 12),
          leads: leadsMeta,
          conversions: 1 + (i % 3),
          spend: spendMeta,
          ctr: 0.06,
          cpl: spendMeta / Math.max(leadsMeta, 1),
          roas: null,
          platform_metrics: {},
        },
        {
          id: crypto.randomUUID(),
          agency_id: agencyId,
          client_id: clientId,
          integration_id: null,
          campaign_id: null,
          date,
          platform: 'google_ads',
          source_type: 'paid',
          impressions: 980 + i * 9,
          clicks: 72 + (i % 10),
          leads: leadsGoogle,
          conversions: 1 + (i % 2),
          spend: spendGoogle,
          ctr: 0.07,
          cpl: spendGoogle / Math.max(leadsGoogle, 1),
          roas: null,
          platform_metrics: {},
        }
      )
    }

    await service.from('traffic_metrics').insert(rows)
  }

  return { user, agencyId, clientId }
}
