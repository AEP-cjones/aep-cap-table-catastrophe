/**
 * Cap Table Catastrophe → Zoho CRM lead sync.
 *
 * Posts an opted-in lead to Claudia's dedicated games endpoint
 * (/api/games/submit-lead). Claudia validates the payload, hardcodes
 * Lead_Source = "Cap Table Catastrophe", and creates the lead in Zoho.
 *
 * This file contains no Zoho creds — the Claudia server holds the
 * service refresh token.
 */

import type { Lead } from '../types'

const CLAUDIA_API_BASE = 'https://aep-claudia-bot.azurewebsites.net'

export interface PushLeadResult {
  zohoLeadId: string
}

export async function pushLeadToZoho(lead: Lead): Promise<PushLeadResult> {
  if (lead.optIn !== true) {
    throw new Error('Lead has not opted in — cannot sync')
  }

  const body = {
    game: 'cap-table-catastrophe' as const,
    firstName: lead.firstName?.trim() || '(Unknown)',
    lastName: lead.lastName?.trim() || '(Unknown)',
    email: lead.email.trim(),
    optIn: true as const,
    ...(lead.company ? { company: lead.company.trim() } : {}),
    ...(lead.nickname ? { extras: { nickname: lead.nickname } } : {}),
  }

  const res = await fetch(`${CLAUDIA_API_BASE}/api/games/submit-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const raw = await res.text()
  let json: { zohoLeadId?: string; error?: string; detail?: unknown }
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error(`Submit failed (HTTP ${res.status}): non-JSON response: ${raw.slice(0, 200)}`)
  }

  if (!res.ok || !json.zohoLeadId) {
    throw new Error(json.error || `Submit failed (HTTP ${res.status})`)
  }
  return { zohoLeadId: json.zohoLeadId }
}
