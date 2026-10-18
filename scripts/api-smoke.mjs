/**
 * HTTP runtime smoke test for the Phase 2 admin API. Run against a running server
 * (`npm run build && npm start`) backed by a DISPOSABLE database.
 *
 * Required env (never hardcode credentials):
 *   BASE_URL            e.g. http://localhost:3000
 *   SMOKE_EMAIL / SMOKE_PASSWORD   an existing SUPER_ADMIN account
 *   SMOKE_INSTRUCTOR_ID / SMOKE_CATEGORY_ID   ids of existing rows (course FKs)
 */
const { BASE_URL, SMOKE_EMAIL, SMOKE_PASSWORD, SMOKE_INSTRUCTOR_ID, SMOKE_CATEGORY_ID } = process.env;
for (const [k, v] of Object.entries({ BASE_URL, SMOKE_EMAIL, SMOKE_PASSWORD, SMOKE_INSTRUCTOR_ID, SMOKE_CATEGORY_ID })) {
  if (!v) { console.error(`Missing env ${k}`); process.exit(2); }
}

const jar = new Map();
const absorb = (res) => { for (const c of res.headers.getSetCookie()) { const [pair] = c.split(';'); const i = pair.indexOf('='); jar.set(pair.slice(0, i), pair.slice(i + 1)); } };
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

async function call(method, path, { body, csrf = true, auth = true, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (auth && jar.size) h.Cookie = cookieHeader();
  if (csrf && jar.get('bama_csrf') && method !== 'GET') h['X-CSRF-Token'] = jar.get('bama_csrf');
  const res = await fetch(`${BASE_URL}/api/v1${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  absorb(res);
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`); if (!cond) failed++; };
const admin = (p) => `/admin${p}`;

// --- authn / authz ---
let r = await call('GET', admin('/courses'), { auth: false });
check('unauthenticated GET /admin/courses -> 401', r.status === 401 && r.json?.success === false, JSON.stringify(r));
r = await call('POST', '/auth/login', { body: { email: SMOKE_EMAIL, password: SMOKE_PASSWORD }, csrf: false, auth: false });
check('login -> 200 + session cookie', r.status === 200 && jar.has('bama_session'), JSON.stringify(r));
const page = await fetch(`${BASE_URL}/admin`, { headers: { Cookie: cookieHeader() }, redirect: 'manual' });
absorb(page);
check('GET /admin issues bama_csrf cookie', jar.has('bama_csrf'));

// --- CSRF ---
r = await call('POST', admin('/courses'), { body: {}, csrf: false });
check('POST without CSRF header -> 403 CSRF_INVALID', r.status === 403 && r.json?.error?.code === 'CSRF_INVALID', JSON.stringify(r));
r = await call('POST', admin('/courses'), { body: { title: 'x' }, headers: { Origin: 'https://evil.example' } });
check('POST with foreign Origin -> 403 BAD_ORIGIN', r.status === 403 && r.json?.error?.code === 'BAD_ORIGIN', JSON.stringify(r));

// --- validation ---
const base = { title: `smoke ${Date.now()}`, shortDesc: 's', description: 'd', instructorId: SMOKE_INSTRUCTOR_ID, categoryId: SMOKE_CATEGORY_ID, price: 100 };
r = await call('POST', admin('/courses'), { body: { ...base, discountPrice: 200 } });
check('discountPrice > price -> 422', r.status === 422 && r.json?.error?.code === 'VALIDATION_ERROR', JSON.stringify(r));
r = await call('POST', admin('/courses'), { body: { ...base, status: 'PUBLISHED' } });
check('unknown field (status) rejected -> 422', r.status === 422, JSON.stringify(r));

// --- course lifecycle ---
r = await call('POST', admin('/courses'), { body: base });
check('create course -> 201 DRAFT', r.status === 201 && r.json?.data?.status === 'DRAFT', JSON.stringify(r));
const course = r.json?.data;
r = await call('GET', admin(`/courses/${course.id}`));
check('get course -> 200', r.status === 200 && r.json?.data?.id === course.id);
r = await call('PATCH', admin(`/courses/${course.id}`), { body: { title: `${base.title} v2` } });
check('patch title keeps slug', r.status === 200 && r.json?.data?.slug === course.slug, JSON.stringify(r));

r = await call('POST', admin(`/courses/${course.id}/sections`), { body: { title: 'A' } });
const s1 = r.json?.data; check('create section -> 201', r.status === 201 && s1?.order === 0, JSON.stringify(r));
r = await call('POST', admin(`/courses/${course.id}/sections`), { body: { title: 'B' } });
const s2 = r.json?.data; check('second section order 1', s2?.order === 1);
r = await call('PUT', admin(`/courses/${course.id}/sections/order`), { body: { ids: [s2.id, s1.id] } });
check('reorder sections -> 200', r.status === 200, JSON.stringify(r));
r = await call('PUT', admin(`/courses/${course.id}/sections/order`), { body: { ids: [s2.id] } });
check('reorder with incomplete ids -> 422', r.status === 422 && r.json?.error?.code === 'REORDER_MISMATCH');

r = await call('POST', admin(`/sections/${s1.id}/lessons`), { body: { title: 'L1', videoProvider: 'eron', videoRef: 'x' } });
const l1 = r.json?.data; check('create lesson -> 201', r.status === 201 && l1?.order === 0, JSON.stringify(r));
r = await call('PATCH', admin(`/lessons/${l1.id}`), { body: { status: 'PUBLISHED' } });
check('patch lesson status -> 200', r.status === 200 && r.json?.data?.status === 'PUBLISHED');
r = await call('DELETE', admin(`/sections/${s1.id}`));
check('delete section with lesson -> 409 SECTION_NOT_EMPTY', r.status === 409 && r.json?.error?.code === 'SECTION_NOT_EMPTY', JSON.stringify(r));
r = await call('DELETE', admin(`/sections/${s2.id}`));
check('delete empty section -> 200', r.status === 200, JSON.stringify(r));

r = await call('POST', admin(`/courses/${course.id}/publish`));
check('publish -> 200 PUBLISHED', r.status === 200 && r.json?.data?.status === 'PUBLISHED', JSON.stringify(r));
r = await call('POST', admin(`/courses/${course.id}/unpublish`));
check('unpublish -> 200 DRAFT', r.status === 200 && r.json?.data?.status === 'DRAFT');
r = await call('POST', admin(`/courses/${course.id}/duplicate`));
const copy = r.json?.data;
check('duplicate -> 201 new DRAFT slug', r.status === 201 && copy?.status === 'DRAFT' && copy?.slug !== course.slug, JSON.stringify(r));
r = await call('GET', admin(`/courses?q=${encodeURIComponent('smoke')}`));
check('list courses -> 200 with meta.total', r.status === 200 && typeof r.json?.meta?.total === 'number');

// --- users ---
r = await call('GET', admin('/users'));
check('list users -> 200, no passwordHash', r.status === 200 && Array.isArray(r.json?.data) && !JSON.stringify(r.json).includes('passwordHash'));
const me = (await call('GET', '/me')).json?.data;
r = await call('PATCH', admin(`/users/${me.id}/role`), { body: { role: 'STUDENT' } });
check('change own role -> 403 SELF_MODIFICATION_FORBIDDEN', r.status === 403 && r.json?.error?.code === 'SELF_MODIFICATION_FORBIDDEN', JSON.stringify(r));
r = await call('POST', admin(`/users/${me.id}/suspend`));
check('suspend self -> 403', r.status === 403);

// --- cleanup (soft deletes) ---
for (const id of [copy?.id, course.id]) if (id) await call('DELETE', admin(`/courses/${id}`));
r = await call('GET', admin(`/courses/${course.id}`));
check('soft-deleted course -> 404', r.status === 404);
r = await call('POST', '/auth/logout', { csrf: false });
check('logout -> 200', r.status === 200);
r = await call('GET', '/me');
check('after logout /me -> 401', r.status === 401);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
