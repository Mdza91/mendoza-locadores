import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

// External Supabase project credentials (for JWT verification)
const EXTERNAL_SUPABASE_URL = 'https://gikeegxdrkelhpfkcaci.supabase.co'
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpa2VlZ3hkcmtlbGhwZmtjYWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjM1MDgsImV4cCI6MjA5MDE5OTUwOH0.GQSx8-KblrXTzNxnwGi5j_QzwKhJr-akLP-KwBG-FsY'

const R2_ENDPOINT = Deno.env.get('R2_ENDPOINT') ?? ''
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID') ?? ''
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? ''
const R2_BUCKET = 'documentos'

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

async function signRequest(method: string, path: string, body: Uint8Array, contentType: string): Promise<Response> {
  const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET}/${path}`)
  const now = new Date()
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const shortDate = dateStamp.slice(0, 8)
  const region = 'auto'
  const service = 's3'

  const payloadHash = await sha256(body)
  
  const headers: Record<string, string> = {
    'host': url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStamp,
  }
  if (contentType) headers['content-type'] = contentType

  const signedHeaderKeys = Object.keys(headers).sort()
  const signedHeaders = signedHeaderKeys.join(';')
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('')

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.replace('?', ''),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    credentialScope,
    await sha256(new TextEncoder().encode(canonicalRequest)),
  ].join('\n')

  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, shortDate, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const fetchHeaders: Record<string, string> = {
    ...headers,
    'Authorization': authorization,
  }

  return fetch(url.toString(), {
    method,
    headers: fetchHeaders,
    body: method !== 'DELETE' && method !== 'GET' ? body : undefined,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'upload') {
      const formData = await req.formData()
      const file = formData.get('file') as File
      const path = formData.get('path') as string

      if (!file || !path) {
        return new Response(JSON.stringify({ error: 'file and path are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      const r2Response = await signRequest('PUT', path, bytes, file.type || 'application/octet-stream')

      if (!r2Response.ok) {
        const errText = await r2Response.text()
        console.error('R2 upload error:', errText)
        throw new Error('Failed to upload to R2')
      }

      return new Response(
        JSON.stringify({ success: true, path }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      const { paths } = await req.json()
      if (!paths || !Array.isArray(paths)) {
        return new Response(JSON.stringify({ error: 'paths array is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const results = []
      for (const path of paths) {
        const r2Response = await signRequest('DELETE', path, new Uint8Array(), '')
        results.push({ path, ok: r2Response.ok })
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use ?action=upload or ?action=delete' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('R2 storage error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
