"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// The recap is now shown inline on the round detail page.
// This page just redirects there.
function RecapRedirect() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.roundId as string;

  useEffect(() => {
    router.replace(`/rounds/${roundId}`);
  }, [roundId, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-secondary text-[0.9375rem]">Loading...</p>
    </div>
  );
}

export default function RecapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-secondary text-[0.9375rem]">Loading...</p>
        </div>
      }
    >
      <RecapRedirect />
    </Suspense>
  );
}
