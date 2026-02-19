import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getPlayerProfile } from "@/lib/db/players";
import { getPlayerRounds, getRoundHoles } from "@/lib/db/rounds";

/** GET /api/dashboard — 获取首页仪表盘聚合数据 */
export async function GET() {
  try {
    // TODO: 移除 preview mock（临时用于预览）
    if (process.env.SKIP_AUTH === "true") {
      return NextResponse.json({
        profile: { name: "Golfer" },
        recent_rounds: [
          { id: "demo-1", course_name: "Pebble Beach", tee_name: "White", played_date: "2025-06-15", total_score: 89, fw_count: 8, insight: "Driver safe, most holes." },
          { id: "demo-2", course_name: "Torrey Pines South", tee_name: "Blue", played_date: "2025-06-10", total_score: 92, fw_count: 6, insight: "A few fairways missed — safer club helped." },
          { id: "demo-3", course_name: "Bethpage Black", tee_name: "White", played_date: "2025-06-05", total_score: 95, fw_count: 7, insight: "Three wood plan followed." },
        ],
        trends: { total_rounds: 12, avg_score_last5: 91.4, fw_rate_last5: 52.8 },
        insights: [
          "You've been safer off the tee lately.",
          "Drive penalties are decreasing.",
          "Hole 7 still brings trouble.",
          "Control clubs working well.",
        ],
      });
    }

    const userId = await getUserId();

    // 并行获取 profile 和 rounds
    const [profile, allRounds] = await Promise.all([
      getPlayerProfile(userId),
      getPlayerRounds(userId),
    ]);

    // 取最近 5 轮
    const last5 = allRounds.slice(0, 5);

    // 获取每轮的洞数据以计算 FW 次数
    const holesPerRound = await Promise.all(
      last5.map((round) => getRoundHoles(round.id))
    );

    const recentRounds = last5.map((round, i) => {
      const holes = holesPerRound[i];
      const fwCount = holes.filter((h) => h.tee_result === "FW").length;
      return {
        id: round.id,
        course_name: round.course_name ?? "Unknown Course",
        tee_name: round.tee_name ?? "",
        played_date: round.played_date,
        total_score: round.total_score,
        fw_count: fwCount,
      };
    });

    // 计算趋势数据
    let trends: {
      total_rounds: number;
      avg_score_last5: number | null;
      fw_rate_last5: number | null;
    } | null = null;

    if (allRounds.length > 0) {
      // 有杆数的轮次用来算平均分
      const scoredRounds = last5.filter((r) => r.total_score !== null);
      const avgScore =
        scoredRounds.length > 0
          ? Math.round(
              (scoredRounds.reduce((sum, r) => sum + (r.total_score ?? 0), 0) /
                scoredRounds.length) *
                10
            ) / 10
          : null;

      // FW 率：最近 5 轮中所有洞的 FW 命中率
      const totalFw = recentRounds.reduce((sum, r) => sum + r.fw_count, 0);
      const totalHoles = holesPerRound.reduce((sum, holes) => sum + holes.length, 0);

      const fwRate =
        totalHoles > 0
          ? Math.round((totalFw / totalHoles) * 1000) / 10
          : null;

      trends = {
        total_rounds: allRounds.length,
        avg_score_last5: avgScore,
        fw_rate_last5: fwRate,
      };
    }

    return NextResponse.json({
      profile: profile ? { name: profile.name } : null,
      recent_rounds: recentRounds,
      trends,
    });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
