"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, LockKeyhole, Phone, Trophy, UserRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth/hooks";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import type { RegisterPayload } from "@/lib/types";

type RegisterForm = RegisterPayload & { confirmPassword: string };
type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const initialForm: RegisterForm = {
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

const strengthMeta: { label: string; color: string }[] = [
  { label: "", color: "" },
  { label: "Weak", color: "bg-red-500" },
  { label: "Fair", color: "bg-orange-400" },
  { label: "Good", color: "bg-yellow-400" },
  { label: "Strong", color: "bg-emerald-500" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterForm, boolean>>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(form.password);

  useEffect(() => {
    if (!loading && user) {
      router.replace(ROUTES.dashboard);
    }
  }, [loading, router, user]);

  function validateSingle(field: keyof RegisterForm, value: string, currentPw?: string): string {
    switch (field) {
      case "name": return !value.trim() ? "Enter your name." : "";
      case "username":
        if (!value.trim()) return "Choose a username.";
        if (value.trim().length < 3) return "Username must be at least 3 characters.";
        return "";
      case "email": return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Enter a valid email." : "";
      case "password": return value.length < 6 ? "Use at least 6 characters." : "";
      case "confirmPassword": return value !== (currentPw ?? form.password) ? "Passwords do not match." : "";
      default: return "";
    }
  }

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (touched[field]) {
      setErrors((e) => ({ ...e, [field]: validateSingle(field, value) || undefined }));
    }
    // Keep confirm password in sync when password changes
    if (field === "password" && touched.confirmPassword) {
      setErrors((e) => ({ ...e, confirmPassword: form.confirmPassword !== value ? "Passwords do not match." : undefined }));
    }
  }

  function handleBlur(field: keyof RegisterForm) {
    setTouched((t) => ({ ...t, [field]: true }));
    const msg = validateSingle(field, form[field] as string);
    setErrors((e) => ({ ...e, [field]: msg || undefined }));
  }

  function validate(): boolean {
    const nextErrors: RegisterErrors = {};
    if (!form.name.trim()) nextErrors.name = "Enter your name.";
    if (!form.username.trim()) nextErrors.username = "Choose a username.";
    else if (form.username.trim().length < 3) nextErrors.username = "Username must be at least 3 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Enter a valid email.";
    if (form.password.length < 6) nextErrors.password = "Use at least 6 characters.";
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    setErrors(nextErrors);
    setTouched({ name: true, username: true, email: true, password: true, confirmPassword: true });
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

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
      setApiError(caught instanceof Error ? caught.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-grid grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(500px,0.92fr)]">
      {/* Left hero panel */}
      <section className="pitch-hero-bg hidden min-h-screen flex-col justify-end p-12 text-white lg:flex">
        <div className="max-w-lg">
          <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/12 ring-1 ring-white/20 backdrop-blur-sm">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-5xl font-semibold leading-tight tracking-[-0.03em]">
            Build your match rhythm.
          </h1>
          <p className="mt-4 text-base leading-7 text-white/66">
            Save your fields, teams, and booking flow in one elegant place.
          </p>
          <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-white/40">
            {APP_NAME}
          </p>
        </div>
      </section>

      {/* Right form panel */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
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
              Create account
            </h2>
            <p className="mt-1.5 text-sm text-stone-500">
              Join PitchBook and start booking in seconds.
            </p>

            {apiError ? (
              <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {apiError}
              </div>
            ) : null}

            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <Input
                label="Full name"
                leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                value={form.name}
                error={errors.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
              />
              <Input
                label="Username"
                leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                value={form.username}
                error={errors.username}
                onChange={(e) => updateField("username", e.target.value)}
                onBlur={() => handleBlur("username")}
              />
              <Input
                className="sm:col-span-2"
                label="Email address"
                type="email"
                leadingIcon={<AtSign className="h-4 w-4" aria-hidden="true" />}
                value={form.email}
                error={errors.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
              />
              <Input
                className="sm:col-span-2"
                label="Phone number"
                leadingIcon={<Phone className="h-4 w-4" aria-hidden="true" />}
                value={form.phone}
                error={errors.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />

              {/* Password with strength bar */}
              <div className="space-y-1.5">
                <Input
                  label="Password"
                  type="password"
                  leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                  value={form.password}
                  error={errors.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                />
                {form.password.length > 0 && (
                  <div aria-live="polite">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors duration-300",
                            strength >= level ? strengthMeta[strength].color : "bg-stone-200",
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn(
                      "mt-1 text-xs font-medium transition-colors",
                      strength <= 1 ? "text-red-500" : strength === 2 ? "text-orange-500" : strength === 3 ? "text-yellow-600" : "text-emerald-600",
                    )}>
                      {strengthMeta[strength].label}
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Confirm password"
                type="password"
                leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                value={form.confirmPassword}
                error={errors.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
              />
              <Button
                className="sm:col-span-2"
                loading={submitting}
                type="submit"
                size="lg"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create Account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-500">
              Already have an account?{" "}
              <Link
                className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
                href={ROUTES.login}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
