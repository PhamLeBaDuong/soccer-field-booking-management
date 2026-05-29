"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, Trophy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
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
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(ROUTES.dashboard);
    }
  }, [loading, router, user]);

  function validate(): boolean {
    const nextErrors: LoginErrors = {};
    if (!identifier.trim()) {
      nextErrors.identifier = "Enter your username or email.";
    }
    if (!password) {
      nextErrors.password = "Enter your password.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

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
      <section className="pitch-hero-bg hidden min-h-screen items-end p-10 text-white lg:flex">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {APP_NAME}
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[0]">
            Reserve the beautiful game.
          </h1>
          <p className="mt-4 text-base leading-7 text-white/74">
            Premium fields, quiet workflows, and match-ready schedules.
          </p>
        </div>
      </section>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-[8px] bg-neutral-950 text-white">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-neutral-950">
              {APP_NAME}
            </h1>
          </div>
        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold text-neutral-950">Login</h2>
            {apiError ? (
              <p className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
                {apiError}
              </p>
            ) : null}
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <Input
                label="Username or email"
                name="identifier"
                autoComplete="username"
                leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                value={identifier}
                error={errors.identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                value={password}
                error={errors.password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button className="w-full" loading={submitting} type="submit">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Login
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-stone-500">
              Need an account?{" "}
              <Link className="font-semibold text-neutral-950 hover:underline" href={ROUTES.register}>
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
