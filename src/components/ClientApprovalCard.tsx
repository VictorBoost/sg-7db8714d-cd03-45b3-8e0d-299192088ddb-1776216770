import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { paymentService } from "@/services/paymentService";
import { useToast } from "@/hooks/use-toast";

interface ClientApprovalCardProps {
  contractId: string;
  clientApprovalDeadline: string | null;
  paymentStatus: string;
  projectTitle: string;
  /** NZ Friday batch date YYYY-MM-DD once client accepts work */
  stripePayoutScheduledFor?: string | null;
  clientWorkAcceptedAt?: string | null;
  onApprovalComplete: () => void;
}

export function ClientApprovalCard({
  contractId,
  clientApprovalDeadline,
  paymentStatus,
  projectTitle,
  stripePayoutScheduledFor,
  clientWorkAcceptedAt,
  onApprovalComplete,
}: ClientApprovalCardProps) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  if (paymentStatus !== "held" || !clientApprovalDeadline) {
    return null;
  }

  const deadline = new Date(clientApprovalDeadline);
  const now = new Date();
  const hoursRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));

  if (stripePayoutScheduledFor || clientWorkAcceptedAt) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Payout scheduled
          </CardTitle>
          <CardDescription>
            You accepted completed work on &quot;{projectTitle}&quot;. Stripe transfers run on BlueTika&apos;s weekly NZ Friday batch (Wednesday cutoff applies).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">
            Expected batch date (NZ):{" "}
            <span className="text-success">{stripePayoutScheduledFor ?? "pending calculation"}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Funds stay protected until that batch. Contact BlueTika support urgently if you need to pause this payout.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await paymentService.scheduleClientAcceptCompletedWork(contractId);

      toast({
        title: "Work accepted — payout queued",
        description: `Stripe transfer is scheduled for the NZ Friday batch (${result.stripe_payout_scheduled_for}).`,
      });

      setShowApprovalDialog(false);
      onApprovalComplete();
    } catch (error) {
      console.error("Approval error:", error);
      toast({
        title: "Could not schedule payout",
        description: error instanceof Error ? error.message : "Try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <>
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Accept completed work
          </CardTitle>
          <CardDescription>
            Escrow stays protected until BlueTika&apos;s weekly Friday payout (Pacific/Auckland). Approving before Wednesday NZ locks you into this week&apos;s batch where eligible; otherwise the following Friday.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-semibold">Escrow review window</p>
              <p className="text-sm text-muted-foreground">
                About {hoursRemaining}h remaining on the original checkout approval timer — contact support if you need help.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <p>Funds remain held until the scheduled Friday Stripe batch.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <p>If you never tap approve, BlueTika notifies you again after evidence checks — with another 48 hours to raise concerns.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p>You can still reach BlueTika after deadlines if something urgent comes up—we can place an admin hold.</p>
            </div>
          </div>

          <Button onClick={() => setShowApprovalDialog(true)} className="w-full" size="lg">
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Accept work &amp; queue Friday payout
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept completed work?</AlertDialogTitle>
            <AlertDialogDescription>
              This confirms you&apos;re happy for BlueTika to include this escrow payment in the next eligible NZ Friday payout (Wednesday cutoff applies).
              <br />
              <br />
              You won&apos;t receive instant off-platform refunds here — contact support immediately if this payment must be paused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              disabled={isApproving}
              className="bg-success hover:bg-success/90"
            >
              {isApproving ? "Saving..." : "Yes, accept work"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
