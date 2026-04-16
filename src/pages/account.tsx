import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, User, Briefcase, ArrowRight } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { TierProgressCard } from "@/components/TierProgressCard";

type Profile = Tables<"profiles">;

const NZ_LOCATIONS = [
  "Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga",
  "Dunedin", "Palmerston North", "Napier-Hastings", "Nelson", "Rotorua",
  "New Plymouth", "Whangarei", "Other NZ"
];

export default function Account() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    location: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const session = await authService.getCurrentSession();
    if (!session?.user) {
      router.push("/login");
      return;
    }

    const { data, error } = await profileService.getProfile(session.user.id);
    if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        bio: data.bio || "",
        location: data.location || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const session = await authService.getCurrentSession();
    if (!session?.user) {
      router.push("/login");
      return;
    }

    const { error } = await profileService.updateProfile(session.user.id, formData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      loadProfile();
    }

    setLoading(false);
  };

  const handleBecomeProvider = () => {
    router.push("/provider/verify");
  };

  const formatMemberSince = () => {
    if (!profile?.created_at) return null;
    const date = new Date(profile.created_at);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const memberSince = formatMemberSince();

  return (
    <>
      <SEO 
        title="Account Settings - BlueTika"
        description="Manage your BlueTika account settings and profile"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-white">
          <div className="container py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              BlueTika
            </Link>
            <div className="flex gap-4">
              <Button variant="ghost" asChild>
                <Link href="/projects">Browse Projects</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/contracts">My Contracts</Link>
              </Button>
              <Button variant="outline" onClick={() => authService.signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 py-12">
          <div className="container max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
              <p className="text-muted-foreground">
                Manage your profile and account preferences
              </p>
            </div>

            <div className="space-y-6">
              {/* Account Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Status</CardTitle>
                  <CardDescription>Your current account type and capabilities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Client Account</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile?.is_client ? "Active - You can post projects and hire service providers" : "Not activated"}
                      </p>
                    </div>
                    {profile?.is_client && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Service Provider Account</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile?.is_provider 
                          ? "Active - You can bid on projects and offer services"
                          : "Not activated - Upgrade to start earning"}
                      </p>
                    </div>
                    {profile?.is_provider ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Button onClick={handleBecomeProvider} className="gap-2">
                        Become a Service Provider
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {memberSince && (
                    <>
                      <Separator />
                      <div className="text-sm text-muted-foreground">
                        Member since {memberSince}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Commission Tier Progress (only for providers) */}
              {profile?.is_provider && (
                <TierProgressCard providerId={profile.id} />
              )}

              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Select
                        value={formData.location}
                        onValueChange={(value) => setFormData({ ...formData, location: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your city or region" />
                        </SelectTrigger>
                        <SelectContent>
                          {NZ_LOCATIONS.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}