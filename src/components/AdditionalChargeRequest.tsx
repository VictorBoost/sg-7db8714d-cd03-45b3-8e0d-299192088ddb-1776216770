import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, AlertCircle } from "lucide-react";
import { additionalChargeService } from "@/services/additionalChargeService";
import { useToast } from "@/hooks/use-toast";
import { SafetyBanner } from "@/components/SafetyBanner";
import { contentSafetyService } from "@/services/contentSafetyService";

interface AdditionalChargeRequestProps {
  contractId: string;
  providerId: string;
  clientId: string;
  onRequestSubmitted: () => void;
}

export function AdditionalChargeRequest({
  contractId,
  providerId,
  clientId,
  onRequestSubmitted,
}: AdditionalChargeRequestProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the additional charge.",
        variant: "destructive",
      });
      return;
    }

    // Validate content safety
    const reasonCheck = contentSafetyService.checkContent(reason);
    if (reasonCheck.isBlocked) {
      toast({
        title: "Content Blocked",
        description: reasonCheck.message,
        variant: "destructive",
      });
      
      // Log bypass attempt
      await contentSafetyService.logBypassAttempt(
        providerId,
        reason,
        reasonCheck.detectedPatterns,
        "additional_charge_reason"
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await additionalChargeService.createChargeRequest(
        contractId,
        providerId,
        clientId,
        numAmount,
        reason.trim()
      );

      if (error) throw error;

      toast({
        title: "Request Sent",
        description: "The client has been notified of your additional charge request.",
      });

      setAmount("");
      setReason("");
      onRequestSubmitted();
    } catch (error) {
      console.error("Additional charge request error:", error);
      toast({
        title: "Error",
        description: "Failed to submit additional charge request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-accent" />
          Request Additional Charge
        </CardTitle>
        <CardDescription>
          Request payment for additional work or materials not covered in the original agreement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SafetyBanner />
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The client will receive an email and in-platform notification to approve or decline your request.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="charge-amount">Amount (NZD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                id="charge-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Commission at your current tier rate will apply
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="charge-reason">Reason for Additional Charge</Label>
            <Textarea
              id="charge-reason"
              placeholder="Describe what additional work was required, materials purchased, or other justification..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || !amount || !reason.trim()}
            className="w-full"
          >
            {submitting ? "Sending Request..." : "Send Request to Client"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}