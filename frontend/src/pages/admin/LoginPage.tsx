import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { login } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";

export function LoginPage({ signedIn }: { signedIn: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (signedIn) return <Navigate to="/admin" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login(email, password);
      queryClient.setQueryData(["auth-user"], user);
      const destination = (location.state as { from?: string } | null)?.from ?? "/admin";
      navigate(destination, { replace: true });
    } catch {
      setError("That email and password did not match.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mirage-bg px-5 text-white">
      <Card className="w-full max-w-md p-7">
        <Logo to="/" />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.24em] text-mirage-cyan">Garage OS</p>
        <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-mirage-muted">Private access for Mirage Motorworks.</p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Email
            <Input className="mt-2" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <Input className="mt-2" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="text-sm text-mirage-orange" role="alert">{error}</p>}
          <Button className="w-full" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</Button>
        </form>
      </Card>
    </main>
  );
}
