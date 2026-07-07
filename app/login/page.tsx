// "use client";

// import { useState } from "react";
// import { signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";

// const roleOptions = [
//   { value: "ADMIN", label: "Admin" },
//   { value: "STUDENT", label: "Student" },
//   { value: "TEACHER", label: "Teacher" },
//   { value: "WARDEN", label: "Warden" },
// ];

// const roleDashboardMap: Record<string, string> = {
//   ADMIN: "/dashboard/admin",
//   STUDENT: "/dashboard/student",
//   TEACHER: "/dashboard/teacher",
//   WARDEN: "/dashboard/warden",
// };

// export default function LoginPage() {
//   const router = useRouter();
//   const [role, setRole] = useState("ADMIN");
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     const result = await signIn("credentials", {
//       username,
//       password,
//       role,
//       redirect: false,
//     });

//     setLoading(false);

//     if (result?.error) {
//       setError("Invalid credentials or role mismatch. Please try again.");
//     } else {
//       router.push(roleDashboardMap[role]);
//       router.refresh();
//     }
//   };

//   return (
//     <div className="min-h-screen bg-zinc-50 text-zinc-950">
//       <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
//         <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
//           <section className="flex flex-col justify-center">
//             <div className="max-w-xl space-y-6">
//               <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
//                  <svg className="h-5 w-5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3.75 4.5 7.5V10c0 4.2 2.45 7.88 7.5 10.25C17.05 17.88 19.5 14.2 19.5 10V7.5L12 3.75Z" />
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.75 10.25h6.5M9.5 13h5M10 15.75h4" />
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.5v12.25" />
//                 </svg>
//               </div>

//               <div className="space-y-3">
//                 <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">CollegeCore</p>
//                 <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
//                   CampusCore unifies campus administration, faculty workflows, and student housing in one secure system.
//                 </h1>
//                 <p className="max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
//                   Sign in to manage academic operations with role-specific access, disciplined workflows, and a trusted
//                   digital workspace for higher-education institutions.
//                 </p>
//               </div>

//               <div className="grid gap-3 sm:grid-cols-3">
//                 {[
//                   "Campus administration and records",
//                   "Faculty coordination and teaching workflows",
//                   "Student housing and residency oversight",
//                 ].map((item) => (
//                   <div key={item} className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
//                     {item}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </section>

//           <Card className="self-center border-zinc-200 bg-white shadow-sm">
//             <CardHeader className="space-y-2 p-8 pb-6">
//               <CardTitle>Sign in</CardTitle>
//               <CardDescription>
//                 Select your role and enter your institutional credentials to continue.
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="p-8 pt-0">
//               {error ? (
//                 <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
//                   {error}
//                 </div>
//               ) : null}

//               <form onSubmit={handleSubmit} className="space-y-6">
//                 <Tabs value={role} onValueChange={setRole}>
//                   <div className="space-y-2">
//                     <Label className="text-zinc-700">Login as</Label>
//                     <TabsList className="grid h-auto w-full grid-cols-4 gap-1 bg-zinc-100/80 p-1">
//                       {roleOptions.map((opt) => (
//                         <TabsTrigger key={opt.value} value={opt.value} className="h-9 text-xs sm:text-sm">
//                           {opt.label}
//                         </TabsTrigger>
//                       ))}
//                     </TabsList>
//                   </div>

//                   {roleOptions.map((opt) => (
//                     <TabsContent key={opt.value} value={opt.value} className="mt-0">
//                       <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
//                         {opt.label} access will route you to the corresponding secure dashboard after authentication.
//                       </div>
//                     </TabsContent>
//                   ))}
//                 </Tabs>

//                 <div className="space-y-1.5">
//                   <Label htmlFor="username">Username</Label>
//                   <Input
//                     id="username"
//                     type="text"
//                     value={username}
//                     onChange={(e) => setUsername(e.target.value)}
//                     placeholder="Enter your username"
//                     autoComplete="username"
//                     required
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <Label htmlFor="password">Password</Label>
//                   <Input
//                     id="password"
//                     type="password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     placeholder="Enter your password"
//                     autoComplete="current-password"
//                     required
//                   />
//                 </div>

//                 <Button
//                   type="submit"
//                   disabled={loading}
//                   className="h-11 w-full rounded-md bg-zinc-900 text-white shadow-sm transition-colors hover:bg-zinc-800"
//                 >
//                   {loading ? "Signing in..." : "Sign in"}
//                 </Button>
//               </form>

//               <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
//                 admin / adminPassword123, student_alice / student123, teacher_john / teacher123, warden_mary / warden123
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "STUDENT", label: "Student" },
  { value: "TEACHER", label: "Teacher" },
  { value: "WARDEN", label: "Warden" },
];

const roleDashboardMap: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  STUDENT: "/dashboard/student",
  TEACHER: "/dashboard/teacher",
  WARDEN: "/dashboard/warden",
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("ADMIN");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      role,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials or role mismatch. Please try again.");
    } else {
      router.push(roleDashboardMap[role]);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          
          {/* Left Branding Section */}
          <section className="flex flex-col justify-center">
            <div className="max-w-xl space-y-8">
              
              {/* Logo and Headings */}
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
                  {/* Clean Academic Shield SVG */}
                  <svg className="h-6 w-6 text-zinc-900" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                
                <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
                  CampusCore
                </h1>
                
                <p className="max-w-xl text-lg leading-7 text-zinc-600">
                  Unifying campus administration, faculty workflows, and student housing in one secure digital workspace.
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Centralized Academic Records",
                  "Faculty & Course Workflows",
                  "Student Housing & Residency",
                  "Automated Fee Management",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right Login Section */}
          <Card className="self-center border-zinc-200 bg-white shadow-sm">
            <CardHeader className="space-y-2 p-8 pb-6">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription className="text-base">
                Select your role and enter your institutional credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              
              {/* Error Alert */}
              {error ? (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              ) : null}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs value={role} onValueChange={setRole}>
                  <div className="space-y-3">
                    <Label className="text-zinc-700">Account Role</Label>
                    <TabsList className="grid h-auto w-full grid-cols-4 gap-1 bg-zinc-100/80 p-1">
                      {roleOptions.map((opt) => (
                        <TabsTrigger key={opt.value} value={opt.value} className="h-9 text-xs sm:text-sm data-[state=active]:shadow-sm">
                          {opt.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </Tabs>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                    className="focus-visible:ring-zinc-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="pr-10 focus-visible:ring-zinc-900"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.98 8.223A10.477 10.477 0 0 0 2.5 12s2.5 6.5 9.5 6.5c1.12 0 2.15-.14 3.08-.39" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.5 6.5 17.5 17.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.28 4.42A10.7 10.7 0 0 1 12 4c7 0 9.5 8 9.5 8a16.607 16.607 0 0 1-3.11 4.84" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 12s2.5-8 9.5-8 9.5 8 9.5 8-2.5 8-9.5 8-9.5-8-9.5-8Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                        </svg>
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-md bg-zinc-900 text-white shadow-sm transition-colors hover:bg-zinc-800"
                >
                  {loading ? "Authenticating..." : "Sign in to Dashboard"}
                </Button>
              </form>

              {/* Styled Demo Access Box */}
              <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sandbox Environment Access
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p><span className="font-medium text-slate-900">Admin:</span> admin / adminPassword123</p>
                  <p><span className="font-medium text-slate-900">Student:</span> student_alice / student123</p>
                  <p><span className="font-medium text-slate-900">Teacher:</span> teacher_john / teacher123</p>
                  <p><span className="font-medium text-slate-900">Warden:</span> warden_mary / warden123</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
