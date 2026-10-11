// 홈 화면이 서버에서 미리 읽어 넘기는 SmartThings 타일 정보. (server-only import 금지)

import type { DeviceKind } from "@/lib/device-kind";

export type SmartThingsTileDto =
  | {
      /** 표시 이름 (앱 지정 이름 → SmartThings 이름) */
      name: string;
      /** SmartThings 쪽 이름 (초기화 시 돌아갈 이름) */
      defaultName: string;
      customName: string | null;
      kind: DeviceKind;
      camera: boolean;
      /** 켜고 끌 수 없는 기기면 undefined, 상태를 모르면 null */
      switchOn?: boolean | null;
    }
  | { error: string };
