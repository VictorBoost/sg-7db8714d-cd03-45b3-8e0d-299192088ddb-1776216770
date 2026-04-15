import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock, Eye, ExternalLink } from "lucide-react";

export default function AdminVerifyProviders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        trade_certificates(*),
        provider_categories(category:categories(name))
      `)
      .eq("is_provider", true)
      .not("verification_submitted_at", "is", null)
      .order("verification_submitted_at", { ascending: false });

    if (error) {
      console.error("Error loading providers:", error);
    } else {
      setProviders(data || []);
    }

    setLoading(false);
  };

  const handleReview = (provider: any, action: "approve" | "reject") => {
    setSelectedProvider(provider);
    setActionType(action);
    setRejectionReason("");
    setDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedProvider) return;

    if (actionType === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    const updates: any = {
      verification_status: actionType === "approve" ? "approved" : "rejected",
      verification_reviewed_at: new Date().toISOString(),
    };

    if (actionType === "reject") {
      updates.verification_rejection_reason = rejectionReason;
    } else {
      updates.verification_rejection_reason = null;
      updates.driver_licence_verified = true;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", selectedProvider.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    } else {
      // Mock email notification
      console.log(`
        MOCK EMAIL SENT TO: ${selectedProvider.email}
        SUBJECT: BlueTika Verification ${actionType === "approve" ? "Approved" : "Rejected"}
        BODY:
        Hi ${selectedProvider.full_name || selectedProvider.first_name},
        
        ${actionType === "approve" 
          ? "Great news! Your service provider verification has been approved. You can now submit bids on projects."
          : `Your verification has been rejected for the following reason:\n\n${rejectionReason}\n\nPlease update your information and resubmit.`
        }
        
        Kind regards,
        BlueTika Team
      `);

      toast({
        title: "Success",
        description: `Provider ${actionType === "approve" ? "approved" : "rejected"} successfully. Mock email sent.`,
      });

      loadProviders();
      setDialogOpen(false);
      setSelectedProvider(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle className="h-4 w-4 mr-1" />
          Approved
        </Badge>
      );
    } else if (status === "rejected") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-4 w-4 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-4 w-4 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <>
      <SEO 
        title="Verify Service Providers - Admin - BlueTika"
        description="Review and approve service provider verifications"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-white">
          <div className="container py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              BlueTika Admin
            </Link>
            <div className="flex gap-4">
              <Button variant="ghost" asChild>
                <Link href="/admin/categories">Categories</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/verify-domestic-helpers">Domestic Helpers</Link>
              </Button>
              <Button asChild>
                <Link href="/">Back to Site</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 py-12">
          <div className="container">
            <Card>
              <CardHeader>
                <CardTitle>Service Provider Verifications</CardTitle>
                <CardDescription>
                  Review driver licences, trade certificates, and approve or reject verifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : providers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No verification submissions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead>Certificates</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providers.map((provider) => (
                        <TableRow key={provider.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {provider.full_name || `${provider.first_name} ${provider.last_name}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Licence: {provider.driver_licence_number || "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{provider.email}</p>
                              <p className="text-muted-foreground">{provider.phone_number || "No phone"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {provider.provider_categories?.map((pc: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {pc.category?.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {provider.driver_licence_url && (
                                <a
                                  href={provider.driver_licence_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Driver Licence
                                </a>
                              )}
                              {provider.trade_certificates?.map((cert: any) => (
                                <a
                                  key={cert.id}
                                  href={cert.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {cert.certificate_type}
                                </a>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(provider.verification_submitted_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(provider.verification_status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {provider.verification_status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReview(provider, "approve")}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReview(provider, "reject")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve Verification" : "Reject Verification"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? `Approve ${selectedProvider?.full_name || selectedProvider?.first_name}'s verification?`
                  : `Provide a reason for rejecting ${selectedProvider?.full_name || selectedProvider?.first_name}'s verification`
                }
              </DialogDescription>
            </DialogHeader>

            {actionType === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Driver licence photo is too blurry, please upload a clearer image"
                  rows={4}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmAction}>
                {actionType === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}