// SmartThings 토큰 갱신 판단 셀프 체크. 실행: node scripts/check-smartthings-token.ts
import assert from "node:assert/strict";

import { needsRefresh, toTokenRow } from "../src/lib/smartthings-token.ts";

const now = new Date("2026-09-30T00:00:00Z");
const min = 60_000;

// 만료 5분 전부터 갱신
assert.equal(needsRefresh(new Date(now.getTime() + 10 * min), now), false);
assert.equal(needsRefresh(new Date(now.getTime() + 5 * min), now), false);
assert.equal(needsRefresh(new Date(now.getTime() + 5 * min - 1), now), true);
assert.equal(needsRefresh(new Date(now.getTime() - min), now), true);

// expires_in(초) → 만료 시각
const row = toTokenRow(
  { access_token: "a1", refresh_token: "r2", expires_in: 86_399 },
  "r1",
  now,
);
assert.deepEqual(row, {
  accessToken: "a1",
  refreshToken: "r2",
  expiresAt: new Date(now.getTime() + 86_399_000),
});

// 응답에 refresh_token이 없으면 기존 값 유지
assert.equal(
  toTokenRow({ access_token: "a1", expires_in: 60 }, "r1", now).refreshToken,
  "r1",
);

// 둘 다 없으면 저장할 수 없다
assert.throws(() => toTokenRow({ access_token: "a1", expires_in: 60 }, null, now));

console.log("smartthings-token: ok");
