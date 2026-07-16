"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { registerInstitution, verifyMasterPassword } from "@/app/actions/registerInstitution";

// ── Eye icon helpers ──────────────────────────────────────────────────────────
function EyeOpenIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 12s2.5-8 9.5-8 9.5 8 9.5 8-2.5 8-9.5 8-9.5-8-9.5-8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.98 8.223A10.477 10.477 0 0 0 2.5 12s2.5 6.5 9.5 6.5c1.12 0 2.15-.14 3.08-.39" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.5 6.5 17.5 17.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.28 4.42A10.7 10.7 0 0 1 12 4c7 0 9.5 8 9.5 8a16.607 16.607 0 0 1-3.11 4.84" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
    </svg>
  );
}

export default function RegisterInstitutionPage() {
  const router = useRouter();

  // Gatekeeper states
  const [unlocked, setUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [masterPassword, setMasterPassword] = useState("");
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [gatekeeperError, setGatekeeperError] = useState("");
  const [gatekeeperLoading, setGatekeeperLoading] = useState(false);

  // Form states
  const [institutionName, setInstitutionName] = useState("");
  const [desiredCode, setDesiredCode] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility states for registration form
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredCode, setRegisteredCode] = useState("");
  const [registeredAdmin, setRegisteredAdmin] = useState("");

  // Persist unlock status on page refresh
  useEffect(() => {
    const storedPassword = localStorage.getItem("campuscore_invite_password");
    if (storedPassword) {
      verifyMasterPassword(storedPassword).then((isValid) => {
        if (isValid) {
          setMasterPassword(storedPassword);
          setUnlocked(true);
        } else {
          localStorage.removeItem("campuscore_invite_password");
        }
        setCheckingAuth(false);
      });
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGatekeeperError("");

    if (!masterPassword) {
      setGatekeeperError("Master password is required.");
      return;
    }

    setGatekeeperLoading(true);

    try {
      const isValid = await verifyMasterPassword(masterPassword);
      if (isValid) {
        localStorage.setItem("campuscore_invite_password", masterPassword);
        setUnlocked(true);
      } else {
        setGatekeeperError("Invalid master password. Access denied.");
      }
    } catch (err: any) {
      setGatekeeperError("An error occurred during verification. Please try again.");
    } finally {
      setGatekeeperLoading(false);
    }
  };

  const handleLock = () => {
    localStorage.removeItem("campuscore_invite_password");
    setMasterPassword("");
    setUnlocked(false);
    setGatekeeperError("");
  };

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
        masterPassword, // passed behind the scenes from the unlock step
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

  // Render checking authorization view
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 relative flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // Render Gatekeeper screen if not unlocked
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 relative flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
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
            
            <CardHeader className="space-y-2 p-8 pb-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mb-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Restricted Access</CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Please enter the invitation Master Password to register a new institution instance.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              <form onSubmit={handleUnlock} className="space-y-4">
                {gatekeeperError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
                    {gatekeeperError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="gatekeeper-password">Master Password</Label>
                  <div className="relative">
                    <Input
                      id="gatekeeper-password"
                      type={showMasterPassword ? "text" : "password"}
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      placeholder="Enter registration master password"
                      required
                      className="pr-10 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMasterPassword((v) => !v)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label={showMasterPassword ? "Hide password" : "Show password"}
                    >
                      {showMasterPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={gatekeeperLoading}
                  className="h-11 w-full rounded-md bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-sm transition-all font-semibold"
                >
                  {gatekeeperLoading ? "Verifying..." : "Verify & Unlock Form"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render registration form if unlocked
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 relative flex items-center justify-center">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          
          {/* Back button */}
          <div className="mb-6 flex justify-between items-center">
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-3xl font-extrabold tracking-tight">Register Institution</CardTitle>
                  <CardDescription className="text-base text-zinc-500 dark:text-zinc-400 mt-1">
                    Setup a new instance of CampusCore ERP for your college, university, or school.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Authorized
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLock}
                    className="h-7 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                  >
                    Log Out
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              {success ? (
                <div className="space-y-6 py-4">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-4">
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
                    <Link href="/login" onClick={handleLock}>
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
                          <div className="relative">
                            <Input
                              id="admin-password"
                              type={showAdminPassword ? "text" : "password"}
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder="Min. 8 characters"
                              required
                              className="pr-10 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAdminPassword((v) => !v)}
                              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
                              aria-label={showAdminPassword ? "Hide password" : "Show password"}
                            >
                              {showAdminPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <div className="relative">
                            <Input
                              id="confirm-password"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat password"
                              required
                              className="pr-10 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
                              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
                            </Button>
                          </div>
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
