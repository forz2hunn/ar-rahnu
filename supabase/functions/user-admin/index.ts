import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase function secrets are not configured.' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.replace(/^Bearer\s+/i, '');
  if (!accessToken) return jsonResponse({ error: 'Authentication is required.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userResult.user) return jsonResponse({ error: 'The current session is invalid.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const caller = userResult.user;

  try {
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'bootstrap') {
      const { data: existingMembership, error: membershipError } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('organization_id, role, active, organization:ar_rahnu_organizations(id, name)')
        .eq('user_id', caller.id)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (existingMembership?.active) return jsonResponse({ membership: existingMembership });
      if (existingMembership) return jsonResponse({ error: 'Akses akaun ini telah digantung. Hubungi Admin organisasi.' }, 403);

      const bootstrapEmail = Deno.env.get('BOOTSTRAP_ADMIN_EMAIL')?.trim().toLowerCase();
      if (!bootstrapEmail || caller.email?.toLowerCase() !== bootstrapEmail) {
        return jsonResponse({ error: 'Akaun ini belum menjadi ahli organisasi. Hubungi Admin untuk jemputan.' }, 403);
      }

      const { data: organizations, error: organizationLookupError } = await adminClient
        .from('ar_rahnu_organizations')
        .select('id')
        .limit(1);
      if (organizationLookupError) throw organizationLookupError;
      if (organizations?.length) {
        return jsonResponse({ error: 'Organisasi sudah diwujudkan. Hubungi Admin sedia ada untuk akses.' }, 409);
      }

      const { data: organization, error: organizationError } = await adminClient
        .from('ar_rahnu_organizations')
        .insert({
          name: Deno.env.get('ORGANIZATION_NAME')?.trim() || 'Ar-Rahnu',
          created_by: caller.id,
        })
        .select('id, name')
        .single();
      if (organizationError) throw organizationError;

      const { error: addMemberError } = await adminClient
        .from('ar_rahnu_organization_members')
        .insert({ organization_id: organization.id, user_id: caller.id, role: 'Admin' });
      if (addMemberError) {
        await adminClient.from('ar_rahnu_organizations').delete().eq('id', organization.id);
        throw addMemberError;
      }

      const { data: migratedRow, error: migrateError } = await adminClient
        .from('ar_rahnu_user_data')
        .update({ organization_id: organization.id })
        .eq('user_id', caller.id)
        .select('user_id')
        .maybeSingle();
      if (migrateError || !migratedRow) {
        await adminClient.from('ar_rahnu_organization_members').delete()
          .eq('organization_id', organization.id)
          .eq('user_id', caller.id);
        await adminClient.from('ar_rahnu_organizations').delete().eq('id', organization.id);
        throw migrateError || new Error('Rekod portfolio akaun Admin tidak ditemui untuk dipindahkan.');
      }

      return jsonResponse({
        membership: { organization_id: organization.id, role: 'Admin', active: true, organization },
      });
    }

    const { data: callerMembership, error: callerMembershipError } = await adminClient
      .from('ar_rahnu_organization_members')
      .select('organization_id, role, active')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (callerMembershipError) throw callerMembershipError;
    if (!callerMembership?.active || !['Admin', 'Manager'].includes(callerMembership.role)) {
      return jsonResponse({ error: 'Hanya Admin atau Manager aktif boleh mengakses senarai pengguna.' }, 403);
    }
    const organizationId = callerMembership.organization_id;
    const isAdmin = callerMembership.role === 'Admin';
    const isDeleteAction = action === 'delete-user';

    if (!isAdmin && action !== 'list' && !isDeleteAction) {
      return jsonResponse({ error: 'Hanya Admin boleh menjemput pengguna atau mengubah peranan dan akses.' }, 403);
    }

    if (action === 'list') {
      const { data: organization, error: organizationError } = await adminClient
        .from('ar_rahnu_organizations')
        .select('created_by')
        .eq('id', organizationId)
        .single();
      if (organizationError) throw organizationError;

      const { data: members, error } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('user_id, role, active, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const users = await Promise.all((members || []).map(async (member) => {
        const { data, error: userLookupError } = await adminClient.auth.admin.getUserById(member.user_id);
        if (userLookupError) throw userLookupError;
        return {
          id: member.user_id,
          email: data.user?.email || '',
          role: member.role,
          active: member.active,
          isOrganizationOwner: member.user_id === organization.created_by,
          createdAt: member.created_at,
          lastSignInAt: data.user?.last_sign_in_at || null,
          emailConfirmedAt: data.user?.email_confirmed_at || null,
        };
      }));
      return jsonResponse({ users });
    }

    if (action === 'invite') {
      const email = String(body.email || '').trim().toLowerCase();
      const role = String(body.role || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: 'Masukkan alamat e-mel yang sah.' }, 400);
      }
      if (!['Manager', 'Staff', 'Admin'].includes(role)) {
        return jsonResponse({ error: 'Peranan pengguna tidak sah.' }, 400);
      }

      const origin = request.headers.get('Origin');
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: origin || undefined,
      });
      if (error) {
        if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
          return jsonResponse({
            error: 'Had penghantaran e-mel Supabase telah dicapai. Jemputan belum dihantar. Tunggu had pulih atau konfigurasi Custom SMTP di Supabase Auth sebelum cuba semula.'
          }, 429);
        }
        if (error.code === 'email_exists' || error.code === 'user_already_exists') {
          return jsonResponse({
            error: 'Alamat e-mel ini sudah mempunyai akaun. Jika pengguna belum menerima pautan, minta Admin menghantar pautan tetapan semula kata laluan.'
          }, 409);
        }
        throw error;
      }
      if (!data.user) throw new Error('Supabase tidak memulangkan pengguna jemputan.');

      const { error: addMemberError } = await adminClient
        .from('ar_rahnu_organization_members')
        .insert({ organization_id: organizationId, user_id: data.user.id, role });
      if (addMemberError) {
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw addMemberError;
      }
      return jsonResponse({ invited: true });
    }

    if (action === 'update-role') {
      const userId = String(body.userId || '');
      const role = String(body.role || '');
      if (!userId || !['Admin', 'Manager', 'Staff'].includes(role)) {
        return jsonResponse({ error: 'Pengguna atau peranan tidak sah.' }, 400);
      }
      const { data: target, error: targetError } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('user_id, role, active')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ error: 'Pengguna tidak ditemui dalam organisasi.' }, 404);
      if (target.role === 'Admin' && target.active && role !== 'Admin') {
        const { count, error } = await adminClient
          .from('ar_rahnu_organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('role', 'Admin')
          .eq('active', true);
        if (error) throw error;
        if ((count || 0) <= 1) return jsonResponse({ error: 'Organisasi mesti mempunyai sekurang-kurangnya seorang Admin.' }, 409);
      }
      const { error } = await adminClient
        .from('ar_rahnu_organization_members')
        .update({ role })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
      if (error) throw error;
      return jsonResponse({ updated: true });
    }

    if (action === 'update-access') {
      const userId = String(body.userId || '');
      const active = body.active;
      if (!userId || userId === caller.id || typeof active !== 'boolean') {
        return jsonResponse({ error: 'Pengguna atau status akses tidak sah.' }, 400);
      }
      const { data: target, error: targetError } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('user_id, role, active')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ error: 'Pengguna tidak ditemui dalam organisasi.' }, 404);
      if (!active && target.role === 'Admin' && target.active) {
        const { count, error } = await adminClient
          .from('ar_rahnu_organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('role', 'Admin')
          .eq('active', true);
        if (error) throw error;
        if ((count || 0) <= 1) return jsonResponse({ error: 'Organisasi mesti mempunyai sekurang-kurangnya seorang Admin aktif.' }, 409);
      }
      const { error } = await adminClient
        .from('ar_rahnu_organization_members')
        .update({ active })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
      if (error) throw error;
      return jsonResponse({ updated: true });
    }

    if (action === 'remove') {
      const userId = String(body.userId || '');
      if (!userId || userId === caller.id) {
        return jsonResponse({ error: 'Anda tidak boleh membuang akaun sendiri.' }, 400);
      }
      const { data: target, error: targetError } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('user_id, role, active')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ error: 'Pengguna tidak ditemui dalam organisasi.' }, 404);
      if (target.role === 'Admin' && target.active) {
        const { count, error } = await adminClient
          .from('ar_rahnu_organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('role', 'Admin')
          .eq('active', true);
        if (error) throw error;
        if ((count || 0) <= 1) return jsonResponse({ error: 'Organisasi mesti mempunyai sekurang-kurangnya seorang Admin aktif.' }, 409);
      }
      const { error } = await adminClient
        .from('ar_rahnu_organization_members')
        .update({ active: false })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
      if (error) throw error;
      return jsonResponse({ removed: true });
    }

    if (isDeleteAction) {
      const userId = String(body.userId || '');
      if (!userId || userId === caller.id) {
        return jsonResponse({ error: 'Anda tidak boleh memadam akaun sendiri.' }, 400);
      }

      const { data: target, error: targetError } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('user_id, role, active')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ error: 'Pengguna tidak ditemui dalam organisasi.' }, 404);
      if (!isAdmin && target.role === 'Admin') {
        return jsonResponse({ error: 'Manager tidak dibenarkan memadam akaun Admin.' }, 403);
      }

      const { data: organization, error: organizationError } = await adminClient
        .from('ar_rahnu_organizations')
        .select('created_by')
        .eq('id', organizationId)
        .single();
      if (organizationError) throw organizationError;
      if (organization.created_by === userId) {
        return jsonResponse({ error: 'Akaun pencipta organisasi tidak boleh dipadam. Pindahkan pemilikan organisasi terlebih dahulu.' }, 409);
      }

      if (target.role === 'Admin' && target.active) {
        const { count, error } = await adminClient
          .from('ar_rahnu_organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('role', 'Admin')
          .eq('active', true);
        if (error) throw error;
        if ((count || 0) <= 1) {
          return jsonResponse({ error: 'Organisasi mesti mempunyai sekurang-kurangnya seorang Admin aktif.' }, 409);
        }
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      return jsonResponse({ deleted: true });
    }

    if (action === 'reset-password') {
      const userId = String(body.userId || '');
      const { data: target, error: targetError } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ error: 'Pengguna tidak ditemui dalam organisasi.' }, 404);
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
      if (userError) throw userError;
      if (!userData.user?.email) throw new Error('Alamat e-mel pengguna tidak tersedia.');
      const { error } = await userClient.auth.resetPasswordForEmail(userData.user.email, {
        redirectTo: request.headers.get('Origin') || undefined,
      });
      if (error) throw error;
      return jsonResponse({ sent: true });
    }

    return jsonResponse({ error: 'Tindakan tidak diketahui.' }, 400);
  } catch (error) {
    const authError = error instanceof Error ? error as Error & { code?: string; status?: number } : null;
    console.error('User administration request failed:', authError
      ? { message: authError.message, code: authError.code, status: authError.status }
      : 'Unknown user administration error');
    return jsonResponse({ error: error instanceof Error ? error.message : 'Permintaan pengurusan pengguna gagal.' }, 500);
  }
});
