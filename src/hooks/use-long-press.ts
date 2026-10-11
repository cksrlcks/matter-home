"use client";

import { useRef } from "react";

// 길게 누르기. 길게 눌러서 실행됐으면 뒤따르는 click은 consumeClick()으로 걸러낸다.
// 스크롤이 시작되면 브라우저가 pointercancel을 보내 타이머가 취소된다.
export function useLongPress(onLongPress?: () => void, delay = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    handlers: {
      onPointerDown: () => {
        fired.current = false;
        if (!onLongPress) return;
        clear();
        timer.current = setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, delay);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      // 모바일에서 길게 누르면 뜨는 기본 메뉴를 막는다.
      onContextMenu: (event: React.MouseEvent) => {
        if (onLongPress) event.preventDefault();
      },
    },
    consumeClick: () => {
      const wasLongPress = fired.current;
      fired.current = false;
      return wasLongPress;
    },
  };
}
