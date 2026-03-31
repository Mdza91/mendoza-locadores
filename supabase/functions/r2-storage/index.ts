import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { corsHeaders } from '../_shared/cors.ts'

const EXTERNAL_SUPABASE_URL = 'https://gikeegxdrkelhpfkcaci.supabase.co'
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpa2VlZ3hkcmtlbGhwZmtjYWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjM1MDgsImV4cCI6MjA5MDE5OTUwOH0.GQSx8-KblrXTzNxnwGi5j_QzwKhJr-akLP-KwBG-FsY'

Deno.serve(async (req) => {
  // CORS preflight — must respond before any other logic
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller on external project
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const verifyClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await verifyClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read env
    const r2Endpoint = Deno.env.get('R2_ENDPOINT')
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID')
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
    if (!r2Endpoint || !r2AccessKey || !r2SecretKey) {
      console.error('Missing R2 env vars:', { r2Endpoint: !!r2Endpoint, r2AccessKey: !!r2AccessKey, r2SecretKey: !!r2SecretKey })
      throw new Error('R2 credentials not configured')
    }

    const R2_BUCKET = 'documentos'

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    console.log(`[r2-storage] action=${action} user=${user.email}`)

    if (action === 'upload') {
      let formData: FormData
      try {
        formData = await req.formData()
      } catch (e) {
        console.error('[r2-storage] FormData parse error:', e)
        throw new Error('Invalid form data')
      }

      const file = formData.get('file') as File
      const path = formData.get('path') as string

      if (!file || !path) {
        return new Response(
          JSON.stringify({ error: 'file and path are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[r2-storage] Uploading: ${path} (${file.size} bytes, ${file.type})`)

      const bytes = new Uint8Array(await file.arrayBuffer())
      const contentType = file.type || 'application/octet-stream'

      const r2Response = await signAndSend(
        'PUT', path, bytes, contentType,
        r2Endpoint, R2_BUCKET, r2AccessKey, r2SecretKey
      )

      if (!r2Response.ok) {
        const errText = await r2Response.text()
        console.error('[r2-storage] R2 PUT error:', r2Response.status, errText)
        throw new Error(`R2 upload failed: ${r2Response.status}`)
      }

      console.log(`[r2-storage] Upload OK: ${path}`)
      return new Response(
        JSON.stringify({ success: true, path }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      const { paths } = await req.json()
      if (!paths || !Array.isArray(paths)) {
        return new Response(
          JSON.stringify({ error: 'paths array is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[r2-storage] Deleting ${paths.length} files`)
      const results = []
      for (const p of paths) {
        const r2Res = await signAndSend(
          'DELETE', p, new Uint8Array(), '',
          r2Endpoint, R2_BUCKET, r2AccessKey, r2SecretKey
        )
        results.push({ path: p, ok: r2Res.ok })
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
    console.error('[r2-storage] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ── AWS Signature V4 helpers ──

async function signAndSend(
  method: string,
  objectKey: string,
  body: Uint8Array,
  contentType: string,
  endpoint: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<Response> {
  const targetUrl = new URL(`${endpoint}/${bucket}/${objectKey}`)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const shortDate = amzDate.slice(0, 8)
  const region = 'auto'
  const service = 's3'

  const payloadHash = await sha256Hex(body)

  const headers: Record<string, string> = {
    host: targetUrl.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  if (contentType) headers['content-type'] = contentType

  const sortedKeys = Object.keys(headers).sort()
  const signedHeaders = sortedKeys.join(';')
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headers[k]}\n`).join('')

  const canonicalRequest = [
    method,
    targetUrl.pathname,
    targetUrl.search ? targetUrl.search.slice(1) : '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join('\n')

  const signingKey = await deriveSigningKey(secretAccessKey, shortDate, region, service)
  const signature = hexEncode(await hmac(signingKey, stringToSign))

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  return fetch(targetUrl.toString(), {
    method,
    headers: { ...headers, Authorization: authorization },
    body: method !== 'GET' && method !== 'DELETE' ? body : undefined,
  })
}

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', ck, new TextEncoder().encode(msg)))
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data)
  return hexEncode(new Uint8Array(hash))
}

function hexEncode(arr: Uint8Array): string {
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function deriveSigningKey(secret: string, date: string, region: string, service: string): Promise<Uint8Array> {
  let key = await hmac(new TextEncoder().encode('AWS4' + secret), date)
  key = await hmac(key, region)
  key = await hmac(key, service)
  key = await hmac(key, 'aws4_request')
  return key
}
