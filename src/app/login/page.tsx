import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "로그인 · Matter Home",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Matter Home</h1>
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
