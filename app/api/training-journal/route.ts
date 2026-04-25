import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getTrainingJournals, createTrainingJournal } from "@/lib/db/training-journal";

export async function GET() {
  try {
    const userId = await getUserId();
    const journals = await getTrainingJournals(userId);
    return NextResponse.json(journals);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json() as {
      session_date: string;
      focus_area: string;
      plan: string;
      location?: string;
    };

    if (!body.session_date || !body.focus_area || !body.plan) {
      return NextResponse.json(
        { error: "session_date, focus_area, and plan are required" },
        { status: 400 }
      );
    }

    const journal = await createTrainingJournal(userId, body);
    return NextResponse.json(journal, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}
