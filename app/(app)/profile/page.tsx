"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import { BagEditor } from "@/components/profile/bag-editor";
import { DistanceEditor } from "@/components/profile/distance-editor";
import type {
  PlayerProfile,
  PlayerBagClub,
  PlayerClubDistance,
} from "@/lib/db/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [bagClubs, setBagClubs] = useState<PlayerBagClub[]>([]);
  const [distances, setDistances] = useState<PlayerClubDistance[]>([]);
  const [enabledCodes, setEnabledCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, bagRes, distRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/profile/bag"),
          fetch("/api/profile/distances"),
        ]);

        const profileData = await profileRes.json();
        const bagData = (await bagRes.json()) as PlayerBagClub[];
        const distData = (await distRes.json()) as PlayerClubDistance[];

        setProfile(profileData as PlayerProfile | null);
        setBagClubs(bagData);
        setDistances(distData);

        // 初始化已启用球杆集合
        const codes = new Set<string>();
        for (const c of bagData) {
          if (c.enabled) codes.add(c.club_code);
        }
        setEnabledCodes(codes);
      } catch {
        // 如果请求失败（如未登录），保持空状态
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.875rem] font-semibold text-text">
        Profile & Settings
      </h1>

      {/* 个人信息 */}
      <Card>
        <SectionTitle className="mb-4">Profile Info</SectionTitle>
        <ProfileForm initial={profile} onSaved={setProfile} />
      </Card>

      {/* 球包 */}
      <Card>
        <SectionTitle className="mb-4">My Bag</SectionTitle>
        <BagEditor initial={bagClubs} onChanged={setEnabledCodes} />
      </Card>

      {/* 球杆距离 */}
      <Card>
        <SectionTitle className="mb-4">Club Distances</SectionTitle>
        <DistanceEditor enabledClubs={enabledCodes} initial={distances} />
      </Card>
    </div>
  );
}
