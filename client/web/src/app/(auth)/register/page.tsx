"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth/hooks";
import { APP_NAME, ROUTES } from "@/lib/constants";
import type { RegisterPayload } from "@/lib/types";

type RegisterForm = RegisterPayload & {
  confirmPassword: string;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const initialForm: RegisterForm = {
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(ROUTES.dashboard);
    }
  }, [loading, router, user]);

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate(): boolean {
    const nextErrors: RegisterErrors = {};
    if (!form.name.trim()) {
      nextErrors.name = "Enter your name.";
    }
    if (!form.username.trim()) {
      nextErrors.username = "Choose a username.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email.";
    }
    if (form.password.length < 6) {
      nextErrors.password = "Use at least 6 characters.";
    }
    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
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
      await register({
        name: form.name,
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      router.push(ROUTES.dashboard);
    } catch (caught) {
      setApiError(
        caught instanceof Error ? caught.message : "Registration failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
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
            <h2 className="text-xl font-semibold text-gray-900">Register</h2>
            {apiError ? (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {apiError}
              </p>
            ) : null}
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <Input
                label="Name"
                value={form.name}
                error={errors.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
              <Input
                label="Username"
                value={form.username}
                error={errors.username}
                onChange={(event) => updateField("username", event.target.value)}
              />
              <Input
                className="sm:col-span-2"
                label="Email"
                type="email"
                value={form.email}
                error={errors.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
              <Input
                className="sm:col-span-2"
                label="Phone"
                value={form.phone}
                error={errors.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                error={errors.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
              <Input
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                error={errors.confirmPassword}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
              />
              <Button
                className="sm:col-span-2"
                loading={submitting}
                type="submit"
              >
                Create Account
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-gray-500">
              Already registered?{" "}
              <Link className="font-medium text-green-700" href={ROUTES.login}>
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

