"use client";

interface ScorecardHole {
  par: number;
  yardage: number;
  si: number;
}

interface ScorecardProps {
  holes: ScorecardHole[];
  teeName?: string;
}

/** 标准高尔夫记分卡：Front 9 + Back 9 + Totals */
export function Scorecard({ holes, teeName }: ScorecardProps) {
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);

  const frontPar = front.reduce((s, h) => s + h.par, 0);
  const backPar = back.reduce((s, h) => s + h.par, 0);
  const frontYds = front.reduce((s, h) => s + h.yardage, 0);
  const backYds = back.reduce((s, h) => s + h.yardage, 0);

  // 如果没有任何 yardage 数据，不显示
  const hasData = holes.some((h) => h.yardage > 0);
  if (!hasData) return null;

  const cellBase =
    "px-1.5 py-1.5 text-center text-[0.75rem] border-r border-divider last:border-r-0";
  const headerCell = `${cellBase} font-semibold text-secondary bg-gray-50`;
  const holeNumCell = `${cellBase} font-bold text-text bg-gray-50`;
  const dataCell = `${cellBase} text-text`;
  const totalCell = `${cellBase} font-bold text-text bg-accent/10`;

  return (
    <div className="overflow-x-auto rounded-lg border border-divider">
      {teeName && (
        <div className="px-3 py-1.5 bg-gray-50 border-b border-divider text-[0.75rem] font-semibold text-secondary uppercase tracking-wide">
          {teeName} Tee
        </div>
      )}
      {/* Front 9 */}
      <table className="w-full border-collapse min-w-[500px]">
        <thead>
          <tr className="border-b border-divider">
            <th className={`${headerCell} w-12 text-left pl-3`}>Hole</th>
            {front.map((_, i) => (
              <th key={i} className={holeNumCell}>{i + 1}</th>
            ))}
            <th className={`${headerCell} font-bold`}>OUT</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-divider">
            <td className={`${headerCell} text-left pl-3`}>Yds</td>
            {front.map((h, i) => (
              <td key={i} className={dataCell}>{h.yardage || "—"}</td>
            ))}
            <td className={totalCell}>{frontYds || "—"}</td>
          </tr>
          <tr className="border-b border-divider">
            <td className={`${headerCell} text-left pl-3`}>Par</td>
            {front.map((h, i) => (
              <td key={i} className={dataCell}>{h.par}</td>
            ))}
            <td className={totalCell}>{frontPar}</td>
          </tr>
          <tr className="border-b border-divider">
            <td className={`${headerCell} text-left pl-3`}>SI</td>
            {front.map((h, i) => (
              <td key={i} className={`${dataCell} text-secondary`}>{h.si || "—"}</td>
            ))}
            <td className={totalCell}></td>
          </tr>
        </tbody>
      </table>

      {/* Back 9 */}
      <table className="w-full border-collapse min-w-[500px]">
        <thead>
          <tr className="border-b border-divider">
            <th className={`${headerCell} w-12 text-left pl-3`}>Hole</th>
            {back.map((_, i) => (
              <th key={i} className={holeNumCell}>{i + 10}</th>
            ))}
            <th className={`${headerCell} font-bold`}>IN</th>
            <th className={`${headerCell} font-bold`}>TOT</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-divider">
            <td className={`${headerCell} text-left pl-3`}>Yds</td>
            {back.map((h, i) => (
              <td key={i} className={dataCell}>{h.yardage || "—"}</td>
            ))}
            <td className={totalCell}>{backYds || "—"}</td>
            <td className={totalCell}>{frontYds + backYds || "—"}</td>
          </tr>
          <tr className="border-b border-divider">
            <td className={`${headerCell} text-left pl-3`}>Par</td>
            {back.map((h, i) => (
              <td key={i} className={dataCell}>{h.par}</td>
            ))}
            <td className={totalCell}>{backPar}</td>
            <td className={totalCell}>{frontPar + backPar}</td>
          </tr>
          <tr>
            <td className={`${headerCell} text-left pl-3`}>SI</td>
            {back.map((h, i) => (
              <td key={i} className={`${dataCell} text-secondary`}>{h.si || "—"}</td>
            ))}
            <td className={totalCell}></td>
            <td className={totalCell}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
