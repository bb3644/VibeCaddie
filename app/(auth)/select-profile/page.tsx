"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Profile {
  user_id: string;
  name: string;
}

/** Profile 选择/创建页 */
export default function SelectProfilePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  // 创建新 profile
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(data))
      .finally(() => setLoading(false));
  }, []);

  async function selectProfile(userId: string) {
    setSelecting(userId);
    try {
      const res = await fetch("/api/auth/select-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        router.push("/dashboard");
      }
    } finally {
      setSelecting(null);
    }
  }

  async function deleteProfile(userId: string, name: string) {
    if (!confirm(`确定删除「${name}」？所有打球记录都会被清除，不可恢复。`)) return;
    try {
      const res = await fetch("/api/profiles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.user_id !== userId));
      }
    } catch {
      // 静默失败
    }
  }

  async function createProfile() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const profile = await res.json();
        // 创建后直接选中
        await selectProfile(profile.user_id);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-1 mb-6">
          <h1 className="text-[1.5rem] font-semibold text-text">
            选择球员
          </h1>
          <p className="text-[0.875rem] text-secondary">
            Who&apos;s playing today?
          </p>
        </div>

        {loading ? (
          <p className="text-center text-secondary text-[0.875rem]">加载中...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <div
                key={p.user_id}
                className={`
                  flex items-center gap-2
                  rounded-lg border border-divider
                  hover:bg-bg hover:border-accent
                  transition-colors duration-150
                  ${selecting === p.user_id ? "border-accent bg-accent/5" : ""}
                `}
              >
                <button
                  onClick={() => selectProfile(p.user_id)}
                  disabled={selecting !== null}
                  className="flex-1 text-left px-4 py-3 text-[0.9375rem] font-medium text-text disabled:opacity-50 cursor-pointer"
                >
                  {selecting === p.user_id ? "进入中..." : p.name}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProfile(p.user_id, p.name); }}
                  className="px-3 py-3 text-secondary hover:text-red-500 transition-colors cursor-pointer"
                  title="删除"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-divider">
          {showCreate ? (
            <div className="flex flex-col gap-3">
              <Input
                label="名字"
                value={newName}
                onChange={setNewName}
                placeholder="输入球员名字"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={createProfile}
                  disabled={creating || !newName.trim()}
                  className="flex-1"
                >
                  {creating ? "创建中..." : "创建并进入"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setShowCreate(true)}
              className="w-full"
            >
              + 新建球员
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
}
