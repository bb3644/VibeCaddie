import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const cookieStore = await cookies();
  const hasUserId = cookieStore.get("user_id")?.value;

  if (hasUserId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-bg px-6">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        <div>
          <h1 className="text-[2.25rem] font-semibold text-accent tracking-tight">
            Vibe Caddie
          </h1>
          <p className="text-[1rem] text-secondary mt-1">Your calm golf companion</p>
        </div>

        <p className="text-[0.9375rem] leading-[1.625rem] text-secondary">
          Your AI caddie for smarter golf. Get pre-round briefings, track Op 36
          progress, and receive personalized coaching after every round.
        </p>

        <Link
          href="/select-profile"
          className="
            inline-flex items-center justify-center
            w-full max-w-[280px] min-h-[48px] rounded-lg px-6 py-3
            bg-accent text-pink font-medium text-[1rem]
            hover:bg-accent-hover active:bg-accent-hover
            transition-colors duration-150
          "
        >
          Enter
        </Link>
      </div>
    </main>
  );
}
