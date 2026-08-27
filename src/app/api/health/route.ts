import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isConfigured =
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl?.includes("placeholder-project") &&
    !supabaseUrl?.includes("your-project-ref");

  if (!isConfigured) {
    return NextResponse.json(
      {
        status: "CONFIGURATION_REQUIRED",
        message:
          "Supabase credentials are not yet configured. Please add your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
        envCheck: {
          NEXT_PUBLIC_SUPABASE_URL: Boolean(supabaseUrl),
          NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(supabaseAnonKey),
          SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

    // Test query on event_categories
    const { data: categories, error: catError } = await supabase
      .from("event_categories")
      .select("count", { count: "exact", head: true });

    if (catError) {
      return NextResponse.json(
        {
          status: "DATABASE_MIGRATION_PENDING",
          message:
            "Connected to Supabase, but schema tables are missing. Please run 'supabase/migrations/20260826000001_initial_schema.sql' in your Supabase SQL Editor.",
          error: catError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: "HEALTHY",
        message: "Backend connected and database tables verified successfully.",
        database: {
          connected: true,
          categoriesTableReady: true,
        },
        paymentProvider: process.env.PAYMENT_PROVIDER || "mock",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "CONNECTION_FAILED",
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
