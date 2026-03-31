import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

const EXTERNAL_SUPABASE_URL = 'https://gikeegxdrkelhpfkcaci.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpa2VlZ3hkcmtlbGhwZmtjYWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjM1MDgsImV4cCI6MjA5MDE5OTUwOH0.GQSx8-KblrXTzNxnwGi5j_QzwKhJr-akLP-KwBG-FsY';
const EXTERNAL_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the caller is authenticated on the external project
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const verifyClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user: caller }, error: callerError } = await verifyClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Admin client for privileged operations
    const supabaseAdmin = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { action, locador_id, numero_documento } = await req.json()

    if (action === 'create') {
      console.log('Creating user for locador:', locador_id, 'with document:', numero_documento);
      
      const email = `${numero_documento}@locador.local`;
      
      // Try to create the user; if already exists, find and reuse
      let userId: string;
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: numero_documento,
        email_confirm: true,
        user_metadata: { is_locador: true }
      })

      if (authError) {
        // If user already exists, find them and reuse
        if (authError.message?.includes('already been registered')) {
          console.log('User already exists, finding by email:', email);
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const existing = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (!existing) throw new Error('No se pudo encontrar el usuario existente');
          userId = existing.id;
          
          // Reset password to DNI in case it was changed
          await supabaseAdmin.auth.admin.updateUser(userId, { password: numero_documento });
        } else {
          console.error('Auth error:', authError);
          throw authError;
        }
      } else {
        userId = authData.user.id;
      }

      console.log('User ID:', userId);

      // Link user with locador
      const { error: updateError } = await supabaseAdmin
        .from('locadores')
        .update({ user_id: userId })
        .eq('id', locador_id)

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Assign locador role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: 'locador' }, { onConflict: 'user_id,role' })

      if (roleError) {
        console.error('Role error:', roleError);
        throw roleError;
      }

      console.log('User created and linked successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Cuenta creada exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else if (action === 'delete') {
      console.log('Deleting user for locador:', locador_id);
      
      const { data: locador, error: locadorError } = await supabaseAdmin
        .from('locadores')
        .select('user_id')
        .eq('id', locador_id)
        .single()

      if (locadorError) throw locadorError;
      if (!locador.user_id) throw new Error('No se encontró cuenta de usuario');

      // Delete role
      await supabaseAdmin.from('user_roles').delete().eq('user_id', locador.user_id);

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(locador.user_id);
      if (deleteError) throw deleteError;

      // Clear user_id
      await supabaseAdmin.from('locadores').update({ user_id: null }).eq('id', locador_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Cuenta eliminada exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    throw new Error('Acción no válida')

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
