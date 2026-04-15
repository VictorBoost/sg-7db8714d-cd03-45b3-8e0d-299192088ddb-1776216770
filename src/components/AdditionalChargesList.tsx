import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";
import { additionalChargeService } from "@/services/additionalChargeService";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type AdditionalCharge = Tables<"additional_charges"> & {
  provider?: { full_name: string | null; email: string | null } | null;
  client?: { full_name: string | null; email: string | null } | null;
};

interface AdditionalChargesListProps {
  charges: AdditionalCharge[];
  isClient: boolean;
  onUpdate: () => void;
}

export function AdditionalChargesList({ charges, isClient, onUpdate }: AdditionalChargesListProps) {
  const { toast } = useToast();

  const handleApprove = async (chargeId: string) => {
    try {
      const { error } = await additionalChargeService.approveCharge(chargeId);
      if (error) throw error;

      toast({
        title: "Request Approved",
        description: "You'll be redirected to payment shortly.",
      });
      onUpdate();
    } catch (error) {
      console.error("Approve error:", error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (chargeId: string) => {
    try {
      const { error } = await additionalChargeService.declineCharge(chargeId);
      if (error) throw error;

      toast({
        title: "Request Declined",
        description: "The service provider has been notified.",
      });
      onUpdate();
    } catch (error) {
      console.error("Decline error:", error);
      toast({
        title: "Error",
        description: "Failed to decline request",
        variant: "destructive",
      });
    }
  };

  const handlePayment = (chargeId: string) => {
    window.location.href = `/checkout-additional/${chargeId}`;
  };

  if (charges.length === 0) return null;

  const statusIcons = {
    pending: <Clock className="h-4 w-4" />,
    approved: <CheckCircle className="h-4 w-4" />,
    declined: <XCircle className="h-4 w-4" />,
    paid: <CheckCircle className="h-4 w-4" />,
  };

  const statusColors = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    declined: "bg-red-50 text-red-700 border-red-200",
    paid: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Additional Charges
        </CardTitle>
        <CardDescription>
          {isClient ? "Review additional charge requests" : "Track your additional charge requests"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {charges.map((charge, index) => (
          <div key={charge.id}>
            {index > 0 && <Separator className="my-4" />}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={statusColors[charge.status as keyof typeof statusColors]}>
                      {statusIcons[charge.status as keyof typeof statusIcons]}
                      <span className="ml-1 capitalize">{charge.status}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(charge.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    NZD ${charge.amount.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{charge.reason}</p>
              </div>

              {charge.status === "pending" && isClient && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(charge.id)}
                    className="flex-1 bg-accent hover:bg-accent/90"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Pay
                  </Button>
                  <Button
                    onClick={() => handleDecline(charge.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}

              {charge.status === "approved" && isClient && (
                <Button
                  onClick={() => handlePayment(charge.id)}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Complete Payment
                </Button>
              )}

              {charge.status === "paid" && charge.net_to_provider && (
                <div className="bg-success/10 border border-success/20 p-3 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isClient ? "Amount Paid" : "Your Payout"}:
                    </span>
                    <span className="font-semibold text-success">
                      NZD ${(isClient ? charge.amount : charge.net_to_provider).toLocaleString("en-NZ", { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}