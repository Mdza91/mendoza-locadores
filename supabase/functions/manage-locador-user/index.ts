import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

// External Supabase project credentials
const EXTERNAL_SUPABASE_URL = 'https://gikeegxdrkelhpfkcaci.supabase.co';
const EXTERNAL_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      EXTERNAL_SUPABASE_URL,
      EXTERNAL_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { action, locador_id, numero_documento } = await req.json()

    if (action === 'create') {
      console.log('Creating user for locador:', locador_id, 'with document:', numero_documento);
      
      const email = `${numero_documento}@locador.local`;
      
      // Check if user already exists
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      let userId = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id;
      
      if (!userId) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: numero_documento,
          email_confirm: true,
          user_metadata: { is_locador: true }
        })

        if (authError) {
          console.error('Auth error:', authError);
          throw authError;
        }
        userId = authData.user.id;
      } else {
        console.log('User already exists, reusing:', userId);
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

      console.log('Locador updated with user_id');

      // Assign locador role (use upsert to avoid conflicts)
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: authData.user.id, role: 'locador' }, { onConflict: 'user_id,role' })

      if (roleError) {
        console.error('Role error:', roleError);
        throw roleError;
      }

      console.log('Role assigned successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Cuenta creada exitosamente' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } else if (action === 'delete') {
      console.log('Deleting user for locador:', locador_id);
      
      // Get user_id from locadores
      const { data: locador, error: locadorError } = await supabaseAdmin
        .from('locadores')
        .select('user_id')
        .eq('id', locador_id)
        .single()

      if (locadorError) {
        console.error('Locador error:', locadorError);
        throw locadorError;
      }
      if (!locador.user_id) throw new Error('No se encontró cuenta de usuario')

      console.log('Deleting user:', locador.user_id);

      // Delete user role
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', locador.user_id)

      // Delete user from auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        locador.user_id
      )

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Clear user_id from locadores
      await supabaseAdmin
        .from('locadores')
        .update({ user_id: null })
        .eq('id', locador_id)

      console.log('User deleted successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Cuenta eliminada exitosamente' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    throw new Error('Acción no válida')

  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
