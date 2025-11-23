import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { pendingId } = await req.json()

    if (!pendingId) {
      throw new Error('pendingId é obrigatório')
    }

    // Buscar dados do usuário pendente
    const { data: pendingUser, error: fetchError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('id', pendingId)
      .single()

    if (fetchError || !pendingUser) {
      throw new Error('Usuário pendente não encontrado')
    }

    // Criar usuário no auth.users usando Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: pendingUser.email,
      password: pendingUser.password_hash,
      email_confirm: true,
      user_metadata: {
        username: pendingUser.username
      }
    })

    if (createError) {
      console.error('Erro ao criar usuário:', createError)
      throw createError
    }

    console.log('Usuário criado com sucesso:', newUser.user.id)

    // O trigger 'handle_new_user' já cria automaticamente o perfil e a role
    // quando o usuário é criado em auth.users, então não precisamos fazer isso manualmente

    // Remover da tabela pending_users
    const { error: deleteError } = await supabaseAdmin
      .from('pending_users')
      .delete()
      .eq('id', pendingId)

    if (deleteError) {
      console.error('Erro ao remover pendente:', deleteError)
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Erro na função approve-user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})