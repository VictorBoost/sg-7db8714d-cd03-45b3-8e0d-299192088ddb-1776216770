import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { projectService } from "@/services/projectService";
import { bidService } from "@/services/bidService";
import { BidCard } from "@/components/BidCard";
import { MapPin, DollarSign, Calendar, AlertCircle, Clock, Tag, Image as ImageIcon, Video as VideoIcon, RefreshCw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type Project = Tables<"projects">;
type Bid = Tables<"bids">;

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [bidData, setBidData] = useState({
    amount: "",
    message: "",
  });

  useEffect(() => {
    if (id) {
      loadProject();
      checkUser();
    }
  }, [id]);

  useEffect(() => {
    if (project?.expires_at && !project?.is_expired) {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [project]);

  const updateTimeRemaining = () => {
    if (!project?.expires_at) return;
    
    const now = new Date();
    const expiresAt = new Date(project.expires_at);
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeRemaining("Expired");
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h remaining`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m remaining`);
    } else {
      setTimeRemaining(`${minutes}m remaining`);
    }
  };

  const checkUser = async () => {
    const session = await authService.getCurrentSession();
    if (session?.user) {
      setCurrentUser(session.user);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_provider, verification_status")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setIsProvider(profile.is_provider || false);
        setIsVerified(profile.verification_status === "approved");
      }
    }
  };

  const loadProject = async () => {
    setLoading(true);
    const { data, error } = await projectService.getProject(id as string);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive",
      });
      router.push("/projects");
    } else {
      setProject(data);
      setBids(data?.bids || []);
    }
    
    setLoading(false);
  };

  const handleReopenProject = async () => {
    if (!project) return;
    
    setReopening(true);
    
    const { data, error } = await supabase
      .from("projects")
      .update({
        is_expired: false,
        status: "open",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        reopened_count: (project.reopened_count || 0) + 1,
        last_reopened_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .select()
      .single();
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to reopen project",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Project reopened for 30 more days",
      });
      setProject(data);
    }
    
    setReopening(false);
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit a bid",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }
    
    if (!isProvider) {
      toast({
        title: "Provider account required",
        description: "Only service providers can submit bids",
        variant: "destructive",
      });
      return;
    }
    
    if (!isVerified) {
      toast({
        title: "Verification required",
        description: "Please complete verification before submitting bids",
        variant: "destructive",
      });
      router.push("/provider/verify");
      return;
    }
    
    setSubmitting(true);
    
    const { data, error } = await bidService.createBid({
      project_id: id as string,
      provider_id: currentUser.id,
      amount: parseFloat(bidData.amount),
      message: bidData.message,
      status: "pending"
    });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit bid. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Bid submitted successfully!",
      });
      setBidData({ amount: "", message: "" });
      loadProject();
    }
    
    setSubmitting(false);
  };

  const formatDatePreference = () => {
    if (!project) return "";
    
    switch (project.date_preference) {
      case "asap_flexible":
        return "ASAP or Flexible";
      case "specific_date":
        return `Specific Date: ${new Date(project.specific_date).toLocaleDateString()}`;
      case "date_range":
        return `${new Date(project.date_from).toLocaleDateString()} - ${new Date(project.date_to).toLocaleDateString()}`;
      default:
        return "Not specified";
    }
  };

  if (loading) {
    return (
      <>
        <SEO title="Loading Project - BlueTika" />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </>
    );
  }

  if (!project) {
    return null;
  }

  const statusColors: Record<string, string> = {
    open: "bg-success/10 text-success border-success/20",
    in_progress: "bg-accent/10 text-accent border-accent/20",
    completed: "bg-muted text-muted-foreground border-muted",
    cancelled: "bg-muted text-muted-foreground border-muted",
  };

  const isOwner = currentUser?.id === project.client_id;
  const canBid = isProvider && isVerified && !isOwner && project.status === "open" && !project.is_expired;
  const photos = project.photos || [];
  const hasMedia = photos.length > 0 || project.video_url;

  return (
    <>
      <SEO 
        title={`${project.title} - BlueTika`}
        description={project.description}
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
              {currentUser ? (
                <Button asChild>
                  <Link href="/contracts">My Contracts</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/login">Login</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 py-12">
          <div className="container max-w-5xl">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-3xl mb-2">{project.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant="outline" className={statusColors[project.status]}>
                            {project.status.replace("_", " ")}
                          </Badge>
                          {project.category && (
                            <Badge variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {project.category.name}
                            </Badge>
                          )}
                          {project.is_expired && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {project.is_expired && isOwner && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>This project has expired. Reopen it to accept new bids.</span>
                          <Button 
                            onClick={handleReopenProject} 
                            disabled={reopening}
                            size="sm"
                            className="ml-4"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {reopening ? "Reopening..." : "Reopen Project"}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {!project.is_expired && project.expires_at && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          {timeRemaining} until this project expires
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <h3 className="font-semibold text-lg mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                    </div>

                    {hasMedia && (
                      <div>
                        <h3 className="font-semibold text-lg mb-4">Project Media</h3>
                        
                        {photos.length > 0 && (
                          <div className="space-y-4">
                            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                              <img
                                src={photos[selectedPhotoIndex]}
                                alt={`Project photo ${selectedPhotoIndex + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            {photos.length > 1 && (
                              <div className="grid grid-cols-5 gap-2">
                                {photos.map((photo: string, index: number) => (
                                  <button
                                    key={index}
                                    onClick={() => setSelectedPhotoIndex(index)}
                                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                                      index === selectedPhotoIndex
                                        ? "border-primary"
                                        : "border-transparent hover:border-muted-foreground"
                                    }`}
                                  >
                                    <img
                                      src={photo}
                                      alt={`Thumbnail ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {project.video_url && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <VideoIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Project Video</span>
                            </div>
                            <video
                              controls
                              className="w-full rounded-lg"
                              src={project.video_url}
                            >
                              Your browser does not support video playback.
                            </video>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                      <div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">Budget</span>
                        </div>
                        <p className="text-2xl font-bold">
                          NZD ${project.budget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm font-medium">Location</span>
                        </div>
                        <p className="text-lg">{project.location}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">Date Preference</span>
                        </div>
                        <p className="text-lg">{formatDatePreference()}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Posted</span>
                        </div>
                        <p className="text-lg">
                          {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {canBid && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Submit Your Bid</CardTitle>
                      <CardDescription>
                        Make your offer for this project
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleBidSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Your Bid Amount (NZD) *</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder={project.budget.toString()}
                            value={bidData.amount}
                            onChange={(e) => setBidData({ ...bidData, amount: e.target.value })}
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message">Message to Client *</Label>
                          <Textarea
                            id="message"
                            placeholder="Explain why you're the right person for this job..."
                            value={bidData.message}
                            onChange={(e) => setBidData({ ...bidData, message: e.target.value })}
                            rows={4}
                            required
                          />
                        </div>
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            A 2% platform fee will be added to your bid amount at checkout
                          </AlertDescription>
                        </Alert>
                        <Button type="submit" className="w-full" disabled={submitting}>
                          {submitting ? "Submitting..." : "Submit Bid"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {!isProvider && !isOwner && currentUser && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Only verified service providers can submit bids
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{project.client?.full_name || "Anonymous"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{project.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Bids ({bids.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bids.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No bids yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {bids.map((bid: any) => (
                          <BidCard key={bid.id} bid={bid} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}