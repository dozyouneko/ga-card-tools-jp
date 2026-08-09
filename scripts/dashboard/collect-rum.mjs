// 運営ダッシュボード（issue #56）— Cloudflare Web Analytics（RUM）の GraphQL 集計。
//
// ⚠️ `siteTag` に渡すのは **site tag**（27d8…）。HTMLのビーコンに書いてある **site token**（79f3…）
//    を渡すとエラーにならずに0件になる（設計書 §3.2）。
// ⚠️ トークンに Account → Account Analytics → Read が無いと `not authorized for that account`。
//    その場合もプロセスは落とさず、このセクションだけ理由つきで失敗させる（§4.3 fail-open）。
import { readCloudflareToken, ACCOUNT_ID } from "./collect-d1.mjs";

export const SITE_TAG = "27d8cfee93a54d88932ee8790fe4f9a9";
const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

/** 権限不足かどうかを応答から判定する（画面に出す対処手順を切り替えるため）。 */
function looksLikePermissionError(text) {
  return /not authorized|unauthorized|permission|authentication error|forbidden/i.test(String(text || ""));
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * RUM の1クエリ分の GraphQL を組み立てる。
 * `orderBy` はスキーマの列挙名に依存するため、失敗したら外して1回だけ再試行する。
 */
function buildQuery({ dimensions, limit, orderBy }) {
  const order = orderBy ? `, orderBy: [${orderBy}]` : "";
  return `query($accountTag: String!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      groups: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: ${limit}${order}) {
        count
        sum { visits }
        avg { sampleInterval }
        dimensions { ${dimensions.join(" ")} }
      }
    }
  }
}`;
}

async function gql(token, query, variables) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: `GraphQLの応答がJSONではありません（HTTP ${res.status}）: ${text.slice(0, 300)}` };
  }
  if (json.errors && json.errors.length) {
    return { error: json.errors.map((e) => e.message).join(" / ") };
  }
  const groups = json?.data?.viewer?.accounts?.[0]?.groups;
  if (!Array.isArray(groups)) {
    return { error: `想定した構造で返りませんでした: ${text.slice(0, 300)}` };
  }
  return { groups };
}

async function fetchGroup(token, { dimensions, limit, orderBy, filter }) {
  const variables = { accountTag: ACCOUNT_ID, filter };
  let r = await gql(token, buildQuery({ dimensions, limit, orderBy }), variables);
  if (r.error && orderBy) {
    // orderBy の列挙名が違うだけなら、外せば通る。件数は取得後にこちらで並べ替える。
    r = await gql(token, buildQuery({ dimensions, limit, orderBy: null }), variables);
  }
  return r;
}

/** PV = count × avg(sampleInterval)（設計書 §5.2。妥当性は V4b で突合する） */
function pvOf(g) {
  const c = Number(g.count || 0);
  const s = Number(g?.avg?.sampleInterval ?? 1) || 1;
  return Math.round(c * s);
}
function visitsOf(g) {
  return Number(g?.sum?.visits || 0);
}

/**
 * 閲覧セクションを集める。
 * 返り値は `{ ok: true, data }` か `{ ok: false, reason, permission }`。
 */
export async function collectRum({ log = () => {}, days = 30 } = {}) {
  const token = await readCloudflareToken();
  if (!token) {
    return {
      ok: false,
      permission: false,
      reason: "Cloudflare APIトークンが見つかりません（~/.cloudflare-token / 環境変数 CLOUDFLARE_API_TOKEN）。",
    };
  }

  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  const start = new Date(end.getTime() - (days - 1) * 86400_000);
  start.setUTCHours(0, 0, 0, 0);

  // ⚠️ bot: 0 を必ず含める（設計書 §5.2）
  const filter = {
    AND: [
      { siteTag: SITE_TAG },
      { datetime_geq: start.toISOString() },
      { datetime_leq: end.toISOString() },
      { bot: 0 },
    ],
  };

  const specs = [
    { id: "r1", label: "日次", dimensions: ["date"], limit: 100, orderBy: "date_ASC" },
    { id: "r2", label: "パス別", dimensions: ["requestPath"], limit: 500, orderBy: "count_DESC" },
    { id: "r3", label: "参照元", dimensions: ["refererHost"], limit: 20, orderBy: "count_DESC" },
    { id: "r4", label: "端末種別", dimensions: ["deviceType"], limit: 10, orderBy: "count_DESC" },
    { id: "r5", label: "国別", dimensions: ["countryName"], limit: 20, orderBy: "count_DESC" },
  ];

  const data = { rangeStart: ymd(start), rangeEnd: ymd(end), days };
  const errors = [];
  for (const spec of specs) {
    log(`  RUM ${spec.id}: ${spec.label}`);
    const r = await fetchGroup(token, { ...spec, filter });
    if (r.error) {
      errors.push({ id: spec.id, label: spec.label, message: r.error });
      continue;
    }
    const key = spec.dimensions[0];
    data[spec.id] = r.groups
      .map((g) => ({ key: g?.dimensions?.[key] ?? "", pv: pvOf(g), visits: visitsOf(g), count: Number(g.count || 0) }))
      .sort((a, b) => (spec.id === "r1" ? a.key.localeCompare(b.key) : b.pv - a.pv));
  }

  if (errors.length === specs.length) {
    const message = errors[0].message;
    return { ok: false, permission: looksLikePermissionError(message), reason: message };
  }
  return { ok: true, data, partialErrors: errors.map((e) => `${e.id}（${e.label}）: ${e.message}`) };
}
