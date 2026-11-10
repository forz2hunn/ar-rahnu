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

const getSessionId = (accessToken: string) => {
  const encodedPayload = accessToken.split('.')[1];
  if (!encodedPayload) return null;
  const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')));
  return typeof payload.session_id === 'string' ? payload.session_id : null;
};

const getErrorInfo = (error: unknown) => {
  if (error instanceof Error) {
    const authError = error as Error & { code?: string; details?: string };
    return {
      message: authError.message,
      code: authError.code,
      details: authError.details,
    };
  }
  if (typeof error === 'string') return { message: error };
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = [record.message, record.error_description, record.details, record.hint]
      .find((value): value is string => typeof value === 'string' && value.length > 0);
    return {
      message: message || 'Ralat Supabase tidak memberikan butiran.',
      code: typeof record.code === 'string' ? record.code : undefined,
      details: typeof record.details === 'string' ? record.details : undefined,
    };
  }
  return { message: 'Ralat tidak diketahui semasa mengurus pengguna.' };
};

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
  const sessionId = getSessionId(accessToken);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        'x-audit-actor-user-id': userResult.user.id,
        'x-audit-session-id': sessionId || '',
        'x-audit-user-agent': request.headers.get('user-agent') || '',
        'x-audit-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'x-audit-proxy-ip': request.headers.get('x-real-ip') || '',
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const caller = userResult.user;
  let action = 'unknown';

  try {
    const recordAuthAuditEvent = async (
      auditAction: string,
      subjectUserId: string,
      payloadBefore: Record<string, unknown> | null,
      payloadAfter: Record<string, unknown> | null,
    ) => {
      const { error } = await adminClient.rpc('ar_rahnu_append_audit_event', {
        p_action: auditAction,
        p_resource_type: 'auth.users',
        p_resource_id: subjectUserId,
        p_organization_id: organizationId,
        p_subject_user_id: subjectUserId,
        p_source_module: 'User Management',
        p_context: { edge_function_action: action },
        p_payload_before: payloadBefore,
        p_payload_after: payloadAfter,
      });
      if (error) {
        console.error('User-admin action succeeded but its audit event could not be recorded:', { action, error });
        throw new Error(`Tindakan berjaya tetapi rekod audit gagal disimpan: ${error.message}`);
      }
    };

    const body = await request.json();
    action = String(body.action || '');

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
      return jsonResponse({ error: 'Hanya Admin boleh menambah pengguna atau mengubah maklumat, peranan dan akses.' }, 403);
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
      await recordAuthAuditEvent('INVITE_USER', data.user.id, null, {
        email,
        invited: true,
        role,
      });
      return jsonResponse({ invited: true });
    }

    if (action === 'create-user') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const role = String(body.role || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: 'Masukkan alamat e-mel yang sah.' }, 400);
      }
      if (password.length < 12) {
        return jsonResponse({ error: 'Kata laluan mesti sekurang-kurangnya 12 aksara.' }, 400);
      }
      if (!['Manager', 'Staff', 'Admin'].includes(role)) {
        return jsonResponse({ error: 'Peranan pengguna tidak sah.' }, 400);
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (error.code === 'email_exists' || error.code === 'user_already_exists') {
          return jsonResponse({ error: 'Alamat e-mel ini sudah mempunyai akaun.' }, 409);
        }
        throw error;
      }
      if (!data.user) throw new Error('Supabase tidak memulangkan pengguna baharu.');

      const { error: addMemberError } = await adminClient
        .from('ar_rahnu_organization_members')
        .insert({ organization_id: organizationId, user_id: data.user.id, role });
      if (addMemberError) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(data.user.id);
        if (cleanupError) {
          console.error('Failed to clean up newly created user after membership insert failed:', cleanupError);
          throw new Error('Akaun pengguna diwujudkan tetapi keahlian organisasi gagal ditambah. Sila hubungi sokongan.');
        }
        throw addMemberError;
      }
      await recordAuthAuditEvent('CREATE_USER', data.user.id, null, {
        email,
        created: true,
        role,
      });
      return jsonResponse({ created: true });
    }

    if (action === 'update-user') {
      const userId = String(body.userId || '');
      const email = String(body.email || '').trim().toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!userId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: 'Pengguna atau alamat e-mel tidak sah.' }, 400);
      }
      if (password && password.length < 12) {
        return jsonResponse({ error: 'Kata laluan mesti sekurang-kurangnya 12 aksara.' }, 400);
      }

      const { data: target, error: targetError } = await adminClient
        .from('ar_rahnu_organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ error: 'Pengguna tidak ditemui dalam organisasi.' }, 404);

      const { data: currentUser, error: currentUserError } = await adminClient.auth.admin.getUserById(userId);
      if (currentUserError) throw currentUserError;
      const attributes: { email?: string; email_confirm?: boolean; password?: string } = {};
      if (currentUser.user?.email?.toLowerCase() !== email) {
        attributes.email = email;
        attributes.email_confirm = true;
      }
      if (password) attributes.password = password;
      if (!Object.keys(attributes).length) {
        return jsonResponse({ error: 'Tiada perubahan untuk disimpan.' }, 400);
      }

      const { error } = await adminClient.auth.admin.updateUserById(userId, attributes);
      if (error) throw error;
      await recordAuthAuditEvent('UPDATE_USER_AUTH', userId, {
        email: currentUser.user?.email || null,
      }, {
        email,
        password_changed: Boolean(password),
      });
      return jsonResponse({ updated: true });
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
        .select('id, created_by')
        .eq('id', organizationId)
        .single();
      if (organizationError) throw organizationError;

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

      const isOrganizationOwner = organization.created_by === userId;
      if (isOrganizationOwner && !isAdmin) {
        return jsonResponse({ error: 'Hanya Admin boleh memadam akaun pemilik organisasi.' }, 403);
      }
      if (isOrganizationOwner) {
        const { error: transferError } = await adminClient
          .from('ar_rahnu_organizations')
          .update({ created_by: caller.id })
          .eq('id', organization.id)
          .eq('created_by', userId);
        if (transferError) throw transferError;
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        if (isOrganizationOwner) {
          const { error: restoreOwnerError } = await adminClient
            .from('ar_rahnu_organizations')
            .update({ created_by: userId })
            .eq('id', organization.id)
            .eq('created_by', caller.id);
          if (restoreOwnerError) {
            console.error('Failed to restore organization owner after account deletion failed:', restoreOwnerError);
            throw new Error('Akaun gagal dipadam dan pemilikan organisasi mungkin telah berubah. Sila hubungi sokongan.');
          }
        }
        throw deleteError;
      }
      await recordAuthAuditEvent('DELETE_USER_ACCOUNT', userId, { account_exists: true }, { account_exists: false });
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
      await recordAuthAuditEvent('RESET_PASSWORD_EMAIL_SENT', userId, { reset_email_sent: false }, { reset_email_sent: true });
      return jsonResponse({ sent: true });
    }

    return jsonResponse({ error: 'Tindakan tidak diketahui.' }, 400);
  } catch (error) {
    const errorInfo = getErrorInfo(error);
    console.error('User administration request failed:', { action, ...errorInfo });
    return jsonResponse({ error: errorInfo.message }, 500);
  }
});
