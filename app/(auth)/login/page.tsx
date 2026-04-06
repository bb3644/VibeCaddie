import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Sign in — Vibe Caddie",
};

/** Passcode 登录页 */
export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-6">
          <Logo className="w-[240px] h-auto" />
        </div>
        <LoginForm />
      </Card>
    </main>
  );
}
