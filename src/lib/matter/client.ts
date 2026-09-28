import "server-only";

import { MatterClient, type WebSocketLike } from "@matter-server/ws-client";
import WebSocket from "ws";

// matterjs-server WebSocket 연결을 한 곳에서 관리한다.
// - 요청마다 새 연결을 만들지 않도록 client를 캐시한다.
// - dev 모드 HMR에서도 살아남도록 globalThis에 보관한다.
// - server-only 이므로 브라우저 bundle에 포함되지 않는다.

type MatterClientStore = {
  client: MatterClient | null;
  ready: Promise<MatterClient> | null;
};

const globalForMatter = globalThis as unknown as {
  __matterStore?: MatterClientStore;
};

const store: MatterClientStore =
  globalForMatter.__matterStore ?? { client: null, ready: null };
globalForMatter.__matterStore = store;

async function initClient(): Promise<MatterClient> {
  const url = process.env.MATTER_SERVER_URL;
  if (!url) {
    throw new Error("MATTER_SERVER_URL 환경변수가 설정되지 않았습니다.");
  }

  const client = new MatterClient(
    url,
    // Node.js에서는 ws 패키지를 factory로 넘긴다.
    (wsUrl) => new WebSocket(wsUrl) as unknown as WebSocketLike,
  );

  // 연결이 끊기면 캐시를 비워서 다음 요청 때 재연결한다.
  client.addEventListener("connection_lost", () => {
    store.client = null;
    store.ready = null;
  });

  // startListening()이 내부적으로 connect() 후 node 목록을 구독한다.
  await client.startListening();
  store.client = client;
  return client;
}

export function getMatterClient(): Promise<MatterClient> {
  if (store.client) return Promise.resolve(store.client);
  if (!store.ready) {
    store.ready = initClient().catch((error) => {
      // 실패를 캐시하지 않고 다음 요청에서 재시도할 수 있게 한다.
      store.ready = null;
      throw error;
    });
  }
  return store.ready;
}
