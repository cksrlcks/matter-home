import { Suspense } from "react";

import { SceneArt } from "@/components/device-art";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "로그인 · Matter Home",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="sticker w-full max-w-sm rounded-3xl bg-card p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <SceneArt scene="house" className="mb-2 size-28" />
          <h1 className="text-2xl">우리집</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            로그인이 필요합니다.
          </p>
        </div>
        {/* useSearchParams는 Suspense 경계가 필요하다. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
