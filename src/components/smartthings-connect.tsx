import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 토큰이 없거나 만료되면 SmartThings 로그인으로 보낸다.
// API 라우트로 이동해 외부로 리다이렉트되므로 <Link>가 아닌 <a>를 쓴다.
export function SmartThingsConnect({ failed = false }: { failed?: boolean }) {
  return (
    <Card className="flex flex-col items-start gap-3 p-5">
      <p className="text-sm text-muted-foreground">
        {failed
          ? "SmartThings 연결에 실패했습니다. 다시 시도해 주세요."
          : "SmartThings 계정 연결이 필요합니다."}
      </p>
      <a href="/api/smartthings/oauth/start" className={buttonClassName()}>
        SmartThings 연결
      </a>
    </Card>
  );
}
