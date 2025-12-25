import client from './client';

export async function login(username, password) {
  const resp = await client.post('/api/token/', { username, password });
  const { access, refresh } = resp.data;
  localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);

  // Immediately try to fetch the authenticated user's profile (/api/me/)
  // so the frontend can learn tenant/role info and store tenant_slug.
  try {
    const profileResp = await client.get('/api/me/');
    const tenantSlug = profileResp.data?.tenant?.slug || profileResp.data?.hospital?.slug;
    if (tenantSlug) localStorage.setItem('tenant_slug', tenantSlug);
    // store full profile for later UI use
    try { localStorage.setItem('current_user_profile', JSON.stringify(profileResp.data)); } catch(e){}
    return { tokens: resp.data, profile: profileResp.data };
  } catch (err) {
    // If profile fetch fails, still return tokens but include the error info.
    const errorInfo = err?.response?.data || err?.message || 'profile_fetch_failed';
    return { tokens: resp.data, profile: null, profileError: errorInfo };
  }
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('tenant_slug');
  localStorage.removeItem('current_user_profile');
}

export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

export function getCurrentUser(){
  // prefer stored profile from /api/me/ (flatten some useful fields)
  const profileStr = localStorage.getItem('current_user_profile');
  if (profileStr) {
    try{
      const p = JSON.parse(profileStr);
      const role = p?.staff?.role || p?.user?.role || p?.role || p?.roles;
      const tenantName = p?.tenant?.name || p?.tenant?.slug || p?.tenant_name || p?.hospital?.name || p?.hospital?.slug;
      return { ...p, role, hospital: tenantName, tenant_name: tenantName };
    }catch(e){ /* fallthrough to token parse */ }
  }

  const token = localStorage.getItem('access_token');
  if(!token) return null;
  try{
    const parts = token.split('.');
    if(parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  }catch(e){ return null; }
}
