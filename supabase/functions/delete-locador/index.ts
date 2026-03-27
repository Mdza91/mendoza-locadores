import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // 2. Delete all files from storage bucket
    const { data: storageFiles } = await supabaseAdmin.storage
      .from('documentos')
      .list(locador_id, { limit: 1000 })

    if (storageFiles && storageFiles.length > 0) {
      const filePaths = storageFiles.map(f => `${locador_id}/${f.name}`)
      await supabaseAdmin.storage.from('documentos').remove(filePaths)
      console.log(`Deleted ${filePaths.length} files from storage`)
    }

    // Also check pending/ subfolder
    const { data: pendingFiles } = await supabaseAdmin.storage
      .from('documentos')
      .list(`${locador_id}/pending`, { limit: 1000 })

    if (pendingFiles && pendingFiles.length > 0) {
      const pendingPaths = pendingFiles.map(f => `${locador_id}/pending/${f.name}`)
      await supabaseAdmin.storage.from('documentos').remove(pendingPaths)
      console.log(`Deleted ${pendingPaths.length} pending files from storage`)
    }

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
