import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { register } from "@/api/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RegisterPage({ signedIn }: { signedIn: boolean }) {
  const navigate = useNavigate(); const client = useQueryClient();
  const [displayName,setDisplayName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  if (signedIn) return <Navigate to="/admin" replace/>;
  async function submit(event:FormEvent){event.preventDefault();setError("");if(password!==confirm){setError("The passwords do not match.");return}setBusy(true);try{const user=await register(email,password,displayName);client.setQueryData(["auth-user"],user);navigate("/admin",{replace:true})}catch{setError("Unable to create the account. Use 12+ characters with upper/lowercase letters and a number, or sign in if the email already exists.")}finally{setBusy(false)}}
  return <main className="grid min-h-screen place-items-center bg-mirage-bg px-5 py-10 text-white"><Card className="w-full max-w-md p-7"><Logo to="/"/><p className="mt-10 text-xs font-semibold uppercase tracking-[.24em] text-mirage-cyan">Mirage account</p><h1 className="mt-2 text-3xl font-semibold">Create your profile</h1><p className="mt-2 text-sm leading-6 text-mirage-muted">Keep your vehicles, maintenance history, and Mirage reports together.</p><form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm font-medium">Name<Input className="mt-2" autoComplete="name" required minLength={2} value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label className="block text-sm font-medium">Email<Input className="mt-2" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-sm font-medium">Password<Input className="mt-2" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><span className="mt-2 block text-xs font-normal leading-5 text-mirage-muted">12–128 characters with uppercase, lowercase, and a number. Symbols like !@#$%^&amp;* are supported.</span></label><label className="block text-sm font-medium">Confirm password<Input className="mt-2" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p className="text-sm text-mirage-orange" role="alert">{error}</p>}<Button className="w-full" disabled={busy}>{busy?"Creating account…":"Create account"}</Button></form><p className="mt-6 text-center text-sm text-mirage-muted">Already have an account? <Link className="text-mirage-cyan" to="/login">Sign in</Link></p></Card></main>
}
