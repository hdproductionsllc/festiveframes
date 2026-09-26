import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  const { e } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#1b2a4a]">MySchoolFrame · Staff</p>
        <h1 className="mt-1 text-[22px] font-semibold text-stone-900">Sign in</h1>
        <p className="mt-1 text-[14px] text-stone-600">
          Enter your email and we&apos;ll send you a sign-in link. Only staff addresses can sign in.
        </p>
        {e === "link" && (
          <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">
            That link has expired or was already used. Ask for a new one below.
          </p>
        )}
        <AdminLoginForm />
      </div>
    </div>
  );
}
