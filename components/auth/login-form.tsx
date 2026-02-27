"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Passcode 验证表单 */
export function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "验证失败");
        return;
      }

      router.push("/select-profile");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Passcode"
        type="password"
        value={passcode}
        onChange={setPasscode}
        placeholder="输入访问密码"
        error={error}
      />
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={loading || !passcode}
        className="w-full"
      >
        {loading ? "验证中..." : "进入"}
      </Button>
    </div>
  );
}
