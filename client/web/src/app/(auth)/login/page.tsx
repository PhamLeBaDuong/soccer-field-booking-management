"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="auth-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-green-600 text-white">
            PB
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">
            {APP_NAME}
          </h1>
        </div>
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-900">Login</h2>
            {apiError ? (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {apiError}
              </p>
            ) : null}
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <Input
                label="Username or email"
                name="identifier"
                autoComplete="username"
                value={identifier}
                error={errors.identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                error={errors.password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button className="w-full" loading={submitting} type="submit">
                Login
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-gray-500">
              Need an account?{" "}
              <Link className="font-medium text-green-700" href={ROUTES.register}>
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

