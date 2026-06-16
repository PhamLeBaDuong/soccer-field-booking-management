"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, Trophy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth/hooks";
import { APP_NAME, ROUTES } from "@/lib/constants";

type LoginErrors = {
  identifier?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(ROUTES.dashboard);
    }
  }, [loading, router, user]);

  function validateField(field: "identifier" | "password", value: string): string {
    if (field === "identifier" && !value.trim()) return "Enter your username or email.";
    if (field === "password" && !value) return "Enter your password.";
    return "";
  }

  function handleBlur(field: "identifier" | "password", value: string) {
    setTouched((t) => ({ ...t, [field]: true }));
    const msg = validateField(field, value);
    setErrors((e) => ({ ...e, [field]: msg || undefined }));
  }

  function handleChange(field: "identifier" | "password", value: string) {
    if (field === "identifier") setIdentifier(value);
    else setPassword(value);
    if (touched[field]) {
      const msg = validateField(field, value);
      setErrors((e) => ({ ...e, [field]: msg || undefined }));
    }
  }

  function validate(): boolean {
    const nextErrors: LoginErrors = {};
    if (!identifier.trim()) nextErrors.identifier = "Enter your username or email.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setTouched({ identifier: true, password: true });
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");
    try {
      await login(identifier, password);
      router.push(ROUTES.dashboard);
    } catch (caught) {
      setApiError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-grid grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
      {/* Left hero panel */}
      <section className="pitch-hero-bg hidden min-h-screen flex-col justify-end p-12 text-white lg:flex">
        <div className="max-w-lg">
          <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/12 ring-1 ring-white/20 backdrop-blur-sm">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-5xl font-semibold leading-tight tracking-[-0.03em]">
            Reserve the beautiful game.
          </h1>
          <p className="mt-4 text-base leading-7 text-white/66">
            Premium fields, quiet workflows, and match-ready schedules — all in one place.
          </p>
          <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-white/40">
            {APP_NAME}
          </p>
        </div>
      </section>

      {/* Right form panel */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] bg-neutral-950 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_20px_rgba(0,0,0,0.12)]">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-xl font-semibold tracking-[-0.01em] text-neutral-950">
              {APP_NAME}
            </p>
          </div>

          <div className="rounded-[12px] border border-stone-200/80 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_16px_48px_rgba(12,12,12,0.08)]">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-neutral-950">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-stone-500">
              Welcome back — enter your credentials below.
            </p>

            {apiError ? (
              <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {apiError}
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <Input
                label="Username or email"
                name="identifier"
                autoComplete="username"
                leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                value={identifier}
                error={errors.identifier}
                onChange={(e) => handleChange("identifier", e.target.value)}
                onBlur={(e) => handleBlur("identifier", e.target.value)}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                value={password}
                error={errors.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={(e) => handleBlur("password", e.target.value)}
              />
              <Button className="mt-2 w-full" loading={submitting} type="submit" size="lg">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-500">
              Don&apos;t have an account?{" "}
              <Link
                className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
                href={ROUTES.register}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
