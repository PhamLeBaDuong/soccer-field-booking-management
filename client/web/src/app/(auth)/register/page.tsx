"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, LockKeyhole, Phone, Trophy, UserRound, UserPlus } from "lucide-react";
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
    <div className="auth-grid grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(500px,0.92fr)]">
      <section className="pitch-hero-bg hidden min-h-screen items-end p-10 text-white lg:flex">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {APP_NAME}
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[0]">
            Build your match rhythm.
          </h1>
          <p className="mt-4 text-base leading-7 text-white/74">
            Save your fields, teams, and booking flow in one elegant place.
          </p>
        </div>
      </section>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
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
            <h2 className="text-2xl font-semibold text-neutral-950">Register</h2>
            {apiError ? (
              <p className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
                {apiError}
              </p>
            ) : null}
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <Input
                label="Name"
                leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                value={form.name}
                error={errors.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
              <Input
                label="Username"
                leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                value={form.username}
                error={errors.username}
                onChange={(event) => updateField("username", event.target.value)}
              />
              <Input
                className="sm:col-span-2"
                label="Email"
                type="email"
                leadingIcon={<AtSign className="h-4 w-4" aria-hidden="true" />}
                value={form.email}
                error={errors.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
              <Input
                className="sm:col-span-2"
                label="Phone"
                leadingIcon={<Phone className="h-4 w-4" aria-hidden="true" />}
                value={form.phone}
                error={errors.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
              <Input
                label="Password"
                type="password"
                leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                value={form.password}
                error={errors.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
              <Input
                label="Confirm password"
                type="password"
                leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
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
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create Account
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-stone-500">
              Already registered?{" "}
              <Link className="font-semibold text-neutral-950 hover:underline" href={ROUTES.login}>
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
