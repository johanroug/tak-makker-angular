import { createClient } from 'npm:@supabase/supabase-js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply('Metoden understøttes ikke.', 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply('Log ind for at bruge taleinput.', 401);
  const billing = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let requestId: string | undefined;
  try {
    const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: auth, error: authError } = await user.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return reply('Log ind igen for at bruge taleinput.', 401);
    const { data: access, error: accessError } = await user.rpc('can_access_app');
    if (accessError || access !== true) return reply('Du har ikke adgang til taleinput.', 403);
    if (Number(request.headers.get('content-length') || 0) > 9 * 1024 * 1024) return reply('Optagelsen er for stor.', 413);
    const form = await request.formData();
    const companyId = form.get('companyId');
    const { data: usage, error: usageError } = await user.rpc('get_company_billing', {
      p_company_id: typeof companyId === 'string' ? companyId : null,
    });
    if (usageError || !usage?.companyId) return reply('Ingen adgang til virksomhedens taleinput.', 403);
    if (!usage.canTranscribe) return Response.json({ error: 'Virksomhedens transskriptioner er brugt eller i gang. Se dit abonnement.', usage }, { status: 403, headers });
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024) return reply('Vælg en kortere optagelse på højst 8 MB.', 400);
    const type = file.type.split(';')[0];
    if (!['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/mpeg'].includes(type)) return reply('Lydformatet understøttes ikke.', 400);
    const { data: allowed, error: limitError } = await user.rpc('reserve_speech_upload');
    if (limitError) return reply('Taleinput er ikke klar endnu. Prøv igen senere.', 503);
    if (!allowed) return reply('Du har lavet mange optagelser. Prøv igen om lidt.', 429);
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return reply('Taleinput er ikke konfigureret endnu.', 503);
    const { data: reservation, error: reserveError } = await billing.rpc('reserve_company_transcription', {
      p_company_id: usage.companyId, p_user_id: auth.user.id,
    });
    if (reserveError) return reply('Forbruget kunne ikke kontrolleres. Prøv igen.', 503);
    if (!reservation?.allowed) return Response.json({ error: 'Virksomhedens transskriptioner er brugt eller i gang. Se dit abonnement.', usage: reservation?.usage }, { status: 403, headers });
    requestId = reservation.requestId;
    const upload = new FormData();
    upload.append('file', file);
    upload.append('model', Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') || 'gpt-4o-mini-transcribe');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: upload,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      console.error('Transcription failed', { status: response.status, requestId: response.headers.get('x-request-id') });
      return reply('Lydoptagelsen kunne ikke behandles. Prøv igen om lidt.', 502);
    }
    const result = await response.json();
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    if (!text) return reply('Vi kunne ikke høre nogen tale. Prøv igen.', 422);
    const { data: updatedUsage, error: finishError } = await billing.rpc('finish_company_transcription', { p_request_id: requestId, p_succeeded: true });
    if (finishError) return reply('Teksten kunne ikke færdigbehandles. Prøv igen.', 503);
    requestId = undefined;
    return Response.json({ text, usage: updatedUsage }, { headers });
  } catch {
    return reply('Lydoptagelsen kunne ikke behandles. Prøv igen.', 500);
  } finally {
    if (requestId) {
      const { error } = await billing.rpc('finish_company_transcription', { p_request_id: requestId, p_succeeded: false });
      if (error) console.error('Could not release transcription reservation');
    }
  }
});
