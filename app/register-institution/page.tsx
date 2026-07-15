"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { registerInstitution } from "@/app/actions/registerInstitution";

export default function RegisterInstitutionPage() {
  const router = useRouter();

  // Form states
  const [institutionName, setInstitutionName] = useState("");
  const [desiredCode, setDesiredCode] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredCode, setRegisteredCode] = useState("");
  const [registeredAdmin, setRegisteredAdmin] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validations
    if (!institutionName.trim()) {
      setError("Institution name is required.");
      return;
    }
    if (!desiredCode.trim()) {
      setError("Institution code is required.");
      return;
    }
    if (desiredCode.trim().length < 3) {
      setError("Institution code must be at least 3 characters.");
      return;
    }
    if (!adminUsername.trim()) {
      setError("Admin username is required.");
      return;
    }
    if (adminPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (adminPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await registerInstitution({
        institutionName,
        desiredCode,
        adminUsername,
        adminPassword,
      });

      if (res.success) {
        setSuccess(true);
        setRegisteredCode(res.slug);
        setRegisteredAdmin(adminUsername.trim().toLowerCase());
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 relative flex items-center justify-center">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          
          {/* Back button */}
          <div className="mb-6">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>

          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500" />
            
            <CardHeader className="space-y-2 p-8 pb-6">
              <CardTitle className="text-3xl font-extrabold tracking-tight">Register Institution</CardTitle>
              <CardDescription className="text-base text-zinc-500 dark:text-zinc-400">
                Setup a new instance of CampusCore ERP for your college, university, or school.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              {success ? (
                <div className="space-y-6 py-4">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mb-4">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-emerald-950 dark:text-emerald-200 mb-2">Registration Successful!</h3>
                    <p className="text-sm text-emerald-800 dark:text-emerald-400 max-w-md mx-auto">
                      Your new institution instance is ready. Keep these details safe for accessing your admin dashboard.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 space-y-4 font-mono text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500 dark:text-zinc-400 font-semibold">INSTITUTION CODE</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{registeredCode}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500 dark:text-zinc-400 font-semibold">ADMIN USERNAME</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{registeredAdmin}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-zinc-500 dark:text-zinc-400 font-semibold">ADMIN ROLE</span>
                      <span className="font-bold text-violet-600 dark:text-violet-400">ADMINISTRATOR</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href="/login">
                      <Button className="w-full h-11 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-sm transition-all font-semibold">
                        Go to Login Page
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {error && (
                    <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
                      {error}
                    </div>
                  )}

                  {/* Section 1: Institution Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b border-zinc-200 dark:border-zinc-800 pb-2">Institution Information</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="institution-name">Institution Name</Label>
                        <Input
                          id="institution-name"
                          type="text"
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          placeholder="e.g. Stanford University"
                          required
                          className="focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="desired-code">Desired Institution Code</Label>
                        <Input
                          id="desired-code"
                          type="text"
                          value={desiredCode}
                          onChange={(e) => setDesiredCode(e.target.value)}
                          placeholder="e.g. stanford"
                          required
                          className="font-mono lowercase tracking-wide focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                          style={{ textTransform: "lowercase" }}
                        />
                        <p className="text-[11px] text-zinc-500">
                          Used as the code when logging in. Alphanumeric only.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Admin Credentials */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b border-zinc-200 dark:border-zinc-800 pb-2">Primary Administrator Credentials</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-username">Admin Username</Label>
                        <Input
                          id="admin-username"
                          type="text"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                          placeholder="e.g. admin or principal"
                          required
                          className="focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="admin-password">Password</Label>
                          <Input
                            id="admin-password"
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            required
                            className="focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            required
                            className="focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-md bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-sm transition-all font-semibold"
                  >
                    {loading ? "Registering Institution..." : "Register Institution & Setup Instance"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
