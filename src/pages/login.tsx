import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Check if already logged in
    checkSession();
  }, []);

  const checkSession = async () => {
    const session = await authService.getCurrentSession();
    if (session) {
      const redirect = router.query.redirect as string;
      router.push(redirect || "/");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await authService.signIn(
        formData.email,
        formData.password
      );

      if (signInError) {
        console.error("Sign in error:", signInError);
        setError(signInError.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      // Redirect to /muna if that's where they came from, otherwise homepage
      const redirect = router.query.redirect as string;
      router.push(redirect || "/");
    } catch (err) {
      console.error("Unexpected login error:", err);
      setError("Connection error. Please check your internet connection and try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Login - BlueTika"
        description="Log in to your BlueTika account"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Log in to your BlueTika account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Log In"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
}