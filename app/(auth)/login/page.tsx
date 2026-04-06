import Image from "next/image";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — Vibe Caddie",
};

/** Passcode 登录页 */
export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo-crop.png"
            alt="Vibe Caddie"
            width={1200}
            height={420}
            className="w-[280px] h-auto"
            priority
          />
        </div>
        <LoginForm />
      </Card>
    </main>
  );
}
