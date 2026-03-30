import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

// External Supabase project credentials
const EXTERNAL_SUPABASE_URL = 'https://gikeegxdrkelhpfkcaci.supabase.co';
const EXTERNAL_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY') ?? '';

const R2_ENDPOINT = Deno.env.get('R2_ENDPOINT') ?? ''
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID') ?? ''
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? ''
const R2_BUCKET = 'documentos'

// S3-compatible signing helpers
async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return new Uint8Array(sig)
}

async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function toHex(arr: Uint8Array): string {
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  let key = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp)
  key = await hmacSha256(key, region)
  key = await hmacSha256(key, service)
  key = await hmacSha256(key, 'aws4_request')
  return key
}

async function r2Delete(path: string): Promise<boolean> {
  const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET}/${path}`)
  const now = new Date()
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const shortDate = dateStamp.slice(0, 8)
  const region = 'auto'
  const service = 's3'
  const body = new Uint8Array()
  const payloadHash = await sha256(body)

  const headers: Record<string, string> = {
    'host': url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStamp,
  }

  const signedHeaderKeys = Object.keys(headers).sort()
  const signedHeaders = signedHeaderKeys.join(';')
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('')

  const canonicalRequest = [
    'DELETE', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n')

  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256', dateStamp, credentialScope,
    await sha256(new TextEncoder().encode(canonicalRequest)),
  ].join('\n')

  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, shortDate, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: { ...headers, 'Authorization': authorization },
  })
  return res.ok
}

async function r2ListObjects(prefix: string): Promise<string[]> {
  const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET}?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000`)
  const now = new Date()
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const shortDate = dateStamp.slice(0, 8)
  const region = 'auto'
  const service = 's3'
  const body = new Uint8Array()
  const payloadHash = await sha256(body)

  const headers: Record<string, string> = {
    'host': url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStamp,
  }

  const signedHeaderKeys = Object.keys(headers).sort()
  const signedHeaders = signedHeaderKeys.join(';')
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('')

  const canonicalRequest = [
    'GET', url.pathname, url.search.replace('?', ''), canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n')

  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256', dateStamp, credentialScope,
    await sha256(new TextEncoder().encode(canonicalRequest)),
  ].join('\n')

  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, shortDate, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { ...headers, 'Authorization': authorization },
  })

  if (!res.ok) return []

  const xml = await res.text()
  const keys: string[] = []
  const regex = /<Key>([^<]+)<\/Key>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    keys.push(match[1])
  }
  return keys
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      EXTERNAL_SUPABASE_URL,
      EXTERNAL_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { locador_id } = await req.json()
    if (!locador_id) throw new Error('locador_id es requerido')

    console.log('Deleting locador:', locador_id)

    // 1. Get locador info (user_id for auth deletion)
    const { data: locador, error: locadorError } = await supabaseAdmin
      .from('locadores')
      .select('user_id')
      .eq('id', locador_id)
      .single()

    if (locadorError) throw locadorError

    // 2. Delete all files from R2 bucket
    const allKeys = await r2ListObjects(`${locador_id}/`)
    for (const key of allKeys) {
      await r2Delete(key)
    }
    console.log(`Deleted ${allKeys.length} files from R2`)

    // Also check pending/ subfolder
    const pendingKeys = await r2ListObjects(`pending/${locador_id}/`)
    for (const key of pendingKeys) {
      await r2Delete(key)
    }
    console.log(`Deleted ${pendingKeys.length} pending files from R2`)

    // 3. Delete related records in order (to avoid FK issues)
    const tablesToClean = [
      'cambios_pendientes_datos',
      'cambios_pendientes_documentos', 
      'cambios_pendientes_emergencia',
      'documentos_emergencia',
      'documentos',
      'locador_funciones',
      'planilla_locadores',
      'locadores_audit_log',
    ]

    for (const table of tablesToClean) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('locador_id', locador_id)
      if (error) console.error(`Error deleting from ${table}:`, error.message)
      else console.log(`Cleaned ${table}`)
    }

    // 4. Delete user role and auth user if exists
    if (locador.user_id) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', locador.user_id)
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(locador.user_id)
      if (authError) console.error('Error deleting auth user:', authError.message)
      else console.log('Auth user deleted')
    }

    // 5. Finally delete the locador record
    const { error: deleteLocadorError } = await supabaseAdmin
      .from('locadores')
      .delete()
      .eq('id', locador_id)

    if (deleteLocadorError) throw deleteLocadorError

    console.log('Locador deleted successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Locador eliminado exitosamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Delete locador error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
