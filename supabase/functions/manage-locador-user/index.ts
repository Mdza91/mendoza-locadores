import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { corsHeaders } from '../_shared/cors.ts'

const EXTERNAL_SUPABASE_URL = 'https://gikeegxdrkelhpfkcaci.supabase.co'
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpa2VlZ3hkcmtlbGhwZmtjYWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjM1MDgsImV4cCI6MjA5MDE5OTUwOH0.GQSx8-KblrXTzNxnwGi5j_QzwKhJr-akLP-KwBG-FsY'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated on external project
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const verifyClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await verifyClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client
    const serviceKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) throw new Error('Service role key not configured')

    const admin = createClient(EXTERNAL_SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body = await req.json()
    const { action, locador_id, numero_documento } = body

    if (action === 'create') {
      if (!locador_id || !numero_documento) {
        throw new Error('locador_id y numero_documento son requeridos')
      }

      const email = `${numero_documento}@locador.local`
      console.log(`[create] locador=${locador_id} email=${email}`)

      // Step 1: Check if auth user already exists (from a previous partial attempt)
      let userId: string | undefined

      const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (!listErr && listData?.users) {
        const existing = listData.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        )
        if (existing) {
          userId = existing.id
          console.log(`[create] Found existing auth user: ${userId}`)
          // Reset password to current DNI
          await admin.auth.admin.updateUser(userId, {
            password: numero_documento,
          })
        }
      }

      // Step 2: Create user if not found
      if (!userId) {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: numero_documento,
          email_confirm: true,
          user_metadata: { is_locador: true, locador_id },
        })
        if (createErr) {
          console.error('[create] createUser error:', createErr.message)
          throw new Error(`Error al crear usuario: ${createErr.message}`)
        }
        userId = newUser.user.id
        console.log(`[create] Created new auth user: ${userId}`)
      }

      // Step 3: Link to locador
      const { error: linkErr } = await admin
        .from('locadores')
        .update({ user_id: userId })
        .eq('id', locador_id)
      if (linkErr) {
        console.error('[create] link error:', linkErr.message)
        throw new Error(`Error al vincular usuario: ${linkErr.message}`)
      }

      // Step 4: Assign role
      const { error: roleErr } = await admin
        .from('user_roles')
        .upsert(
          { user_id: userId, role: 'locador' },
          { onConflict: 'user_id,role' }
        )
      if (roleErr) {
        console.error('[create] role error:', roleErr.message)
        throw new Error(`Error al asignar rol: ${roleErr.message}`)
      }

      console.log('[create] Success')
      return new Response(
        JSON.stringify({ success: true, message: 'Cuenta creada exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      if (!locador_id) throw new Error('locador_id es requerido')
      console.log(`[delete] locador=${locador_id}`)

      const { data: loc, error: locErr } = await admin
        .from('locadores')
        .select('user_id')
        .eq('id', locador_id)
        .single()
      if (locErr) throw locErr
      if (!loc?.user_id) throw new Error('No se encontró cuenta de usuario')

      await admin.from('user_roles').delete().eq('user_id', loc.user_id)

      const { error: delErr } = await admin.auth.admin.deleteUser(loc.user_id)
      if (delErr) {
        console.error('[delete] deleteUser error:', delErr.message)
        throw delErr
      }

      await admin
        .from('locadores')
        .update({ user_id: null })
        .eq('id', locador_id)

      console.log('[delete] Success')
      return new Response(
        JSON.stringify({ success: true, message: 'Cuenta eliminada exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Acción no válida. Use action=create o action=delete')
  } catch (error) {
    console.error('[manage-locador-user] Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
