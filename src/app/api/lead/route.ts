import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LeadPayload } from '@/types';

interface LeadRequestBody {
  lead?: LeadPayload;
  referredByCode?: string | null;
}

function isValidLead(lead: unknown): lead is LeadPayload {
  if (!lead || typeof lead !== 'object') return false;
  const candidate = lead as Record<string, unknown>;
  switch (candidate.role) {
    case 'shopper':
      return typeof candidate.email === 'string' && candidate.email.trim().length > 0;
    case 'merchant':
      return (
        typeof candidate.storeName === 'string' &&
        candidate.storeName.trim().length > 0 &&
        typeof candidate.businessContact === 'string' &&
        candidate.businessContact.trim().length > 0 &&
        typeof candidate.district === 'string'
      );
    case 'driver':
      return typeof candidate.email === 'string' && candidate.email.trim().length > 0 && typeof candidate.vehicleType === 'string';
    case 'investor':
      return (
        typeof candidate.name === 'string' &&
        candidate.name.trim().length > 0 &&
        typeof candidate.fundOrEntity === 'string' &&
        typeof candidate.workEmailOrLinkedIn === 'string' &&
        candidate.workEmailOrLinkedIn.trim().length > 0
      );
    default:
      return false;
  }
}

// Service-role client — server-only (this file never ships to the client
// bundle), bypasses RLS so inserts don't need a public write policy.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

function contactFor(lead: LeadPayload): string {
  switch (lead.role) {
    case 'shopper':
    case 'driver':
      return lead.email;
    case 'merchant':
      return lead.businessContact;
    case 'investor':
      return lead.workEmailOrLinkedIn;
  }
}

function detailsFor(lead: LeadPayload): string {
  switch (lead.role) {
    case 'merchant':
      return lead.storeName;
    case 'driver':
      return lead.vehicleType;
    case 'investor':
      return lead.ticketSizeBand;
    default:
      return 'N/A';
  }
}

/**
 * Inserts into `investor_requests` for investor leads, `leads` for everyone
 * else — column names match the tables' actual live schema in Supabase
 * (confirmed via the project's PostgREST OpenAPI schema), not the app's own
 * camelCase LeadPayload field names. Neither table has a referral-code
 * column, so referredByCode isn't persisted here — it only ever fed the
 * in-memory /api/waitlist "spots remaining" counter.
 */
async function persistToSupabase(lead: LeadPayload) {
  if (!supabase) return;

  if (lead.role === 'investor') {
    const { error } = await supabase.from('investor_requests').insert({
      full_name: lead.name,
      fund_entity: lead.fundOrEntity,
      ticket_size: lead.ticketSizeBand,
      work_email: lead.workEmailOrLinkedIn,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('leads').insert({
    role: lead.role,
    email: 'email' in lead ? lead.email : null,
    store_name: 'storeName' in lead ? lead.storeName : null,
    store_district: 'district' in lead ? lead.district : null,
    business_whatsapp: 'businessContact' in lead ? lead.businessContact : null,
    vehicle_type: 'vehicleType' in lead ? lead.vehicleType : null,
    has_license: 'licenseConfirmed' in lead ? lead.licenseConfirmed : null,
  });
  if (error) throw error;
}

async function notifyTelegram(lead: LeadPayload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const text = [
    '🚀 *NEW RESMART LEAD CAPTURED!*',
    `- *Role / Type:* ${lead.role}`,
    `- *Contact:* ${contactFor(lead)}`,
    `- *Details:* ${detailsFor(lead)}`,
    `- *Timestamp:* ${new Date().toISOString()}`,
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
  if (!response.ok) throw new Error(`Telegram API responded ${response.status}`);
}

/**
 * Validates the lead, then fires the Supabase insert and Telegram alert in
 * parallel. Both are best-effort — a failure in either is logged
 * server-side but never blocks the response, matching the client's own
 * localStorage-first, fetch-is-best-effort contract (LeadCaptureCard.tsx /
 * InvestorAccessModal.tsx) so the UI never hangs on a backend hiccup.
 */
export async function POST(request: Request) {
  let body: LeadRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidLead(body.lead)) {
    return NextResponse.json({ ok: false, error: 'Invalid or incomplete lead payload' }, { status: 400 });
  }

  const lead = body.lead;

  const [supabaseResult, telegramResult] = await Promise.allSettled([
    persistToSupabase(lead),
    notifyTelegram(lead),
  ]);

  if (supabaseResult.status === 'rejected') {
    console.error('[ReSmart AI] Supabase insert failed:', supabaseResult.reason);
  }
  if (telegramResult.status === 'rejected') {
    console.error('[ReSmart AI] Telegram notify failed:', telegramResult.reason);
  }

  return NextResponse.json({ ok: true });
}
