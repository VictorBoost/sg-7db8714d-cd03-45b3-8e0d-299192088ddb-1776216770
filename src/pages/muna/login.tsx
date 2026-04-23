import { useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, authenticate with regular login
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: "include"
      });

      if (!loginRes.ok) {
        const error = await loginRes.json();
        throw new Error(error.error || "Login failed");
      }

      // Then verify admin status
      const adminRes = await fetch("/api/auth/verify-admin", {
        credentials: "include"
      });

      if (!adminRes.ok) {
        // Not an admin - log them out and show error
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include"
        });
        throw new Error("Access denied. Admin privileges required.");
      }

      const adminData = await adminRes.json();

      if (!adminData.isAdmin) {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include"
        });
        throw new Error("Access denied. Admin privileges required.");
      }

      toast({
        title: "Access granted",
        description: `Welcome, ${adminData.role}`,
      });

      // Redirect to admin dashboard
      router.push("/muna");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <>
      <SEO 
        title="Admin Login - BlueTika" 
        description="Admin access to BlueTika control panel"
      />
      
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Access restricted to authorized administrators only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="admin@bluetika.co.nz"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Access Admin Panel"}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                This area is restricted. Unauthorized access attempts are logged.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}