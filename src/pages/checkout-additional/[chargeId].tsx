import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, DollarSign, AlertCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { additionalChargeService } from "@/services/additionalChargeService";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm({ 
  chargeId, 
  clientSecret, 
  chargeAmount, 
  platformFee, 
  processingFee, 
  totalAmount,
  commissionRate,
  commissionAmount,
  netToProvider,
  projectTitle 
}: { 
  chargeId: string;
  clientSecret: string;
  chargeAmount: number;
  platformFee: number;
  processingFee: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netToProvider: number;
  projectTitle: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/contracts`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Update additional charge with payment details
        await additionalChargeService.updateChargePayment(
          chargeId,
          paymentIntent.id,
          platformFee,
          processingFee,
          totalAmount,
          commissionRate,
          commissionAmount,
          netToProvider
        );

        toast({
          title: "Payment Successful",
          description: "Additional charge payment has been processed.",
        });

        router.push("/contracts");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Additional Charge</span>
          <span className="font-semibold">NZD ${chargeAmount.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Platform Fee (2%)</span>
          <span className="font-semibold">NZD ${platformFee.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Payment Processing</span>
          <span className="font-semibold">NZD ${processingFee.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="font-bold">Total Due</span>
          <span className="text-2xl font-bold text-primary">NZD ${totalAmount.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <strong>Service Provider Payout:</strong> NZD ${netToProvider.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (after {commissionRate}% commission)
        </AlertDescription>
      </Alert>

      <div className="bg-white border rounded-lg p-4">
        <PaymentElement />
      </div>

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full"
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay NZD $${totalAmount.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secure and encrypted. Funds will be released to the service provider within 2-3 business days.
      </p>
    </form>
  );
}

export default function CheckoutAdditionalCharge() {
  const router = useRouter();
  const { chargeId } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [chargeData, setChargeData] = useState<any>(null);
  const [providerTier, setProviderTier] = useState<string>("starter");

  useEffect(() => {
    if (chargeId && typeof chargeId === "string") {
      loadChargeData();
    }
  }, [chargeId]);

  const loadChargeData = async () => {
    setLoading(true);
    
    try {
      const session = await authService.getCurrentSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }

      // Get charge details
      const { data: charge, error: chargeError } = await supabase
        .from("additional_charges")
        .select(`
          *,
          contract:contracts!additional_charges_contract_id_fkey(
            project:projects!contracts_project_id_fkey(title)
          ),
          provider:profiles!additional_charges_provider_id_fkey(full_name, email, current_tier)
        `)
        .eq("id", chargeId)
        .single();

      if (chargeError || !charge) {
        toast({
          title: "Error",
          description: "Additional charge not found",
          variant: "destructive",
        });
        router.push("/contracts");
        return;
      }

      // Verify user is the client
      if (charge.client_id !== session.user.id) {
        toast({
          title: "Access Denied",
          description: "You don't have access to this payment",
          variant: "destructive",
        });
        router.push("/contracts");
        return;
      }

      // Verify charge is approved
      if (charge.status !== "approved") {
        toast({
          title: "Invalid Status",
          description: "This charge cannot be paid in its current status",
          variant: "destructive",
        });
        router.push("/contracts");
        return;
      }

      setChargeData(charge);
      setProviderTier(charge.provider?.current_tier || "starter");

      // Create payment intent
      const response = await fetch("/api/create-payment-intent-additional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });

      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error("Failed to create payment intent");
      }
    } catch (error) {
      console.error("Load error:", error);
      toast({
        title: "Error",
        description: "Failed to load payment details",
        variant: "destructive",
      });
      router.push("/contracts");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <SEO title="Processing..." description="Loading payment details" />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!clientSecret || !chargeData) {
    return null;
  }

  const chargeAmount = chargeData.amount;
  const platformFee = chargeAmount * 0.02;
  const processingFee = (chargeAmount + platformFee) * 0.029 + 0.30;
  const totalAmount = chargeAmount + platformFee + processingFee;

  // Commission calculation based on provider tier
  const commissionRates: { [key: string]: number } = {
    starter: 0.15,
    bronze: 0.12,
    silver: 0.10,
    gold: 0.08,
    platinum: 0.05,
  };
  const commissionRate = commissionRates[providerTier] || 0.15;
  const commissionAmount = chargeAmount * commissionRate;
  const netToProvider = chargeAmount - commissionAmount;

  const projectTitle = chargeData.contract?.project?.title || "Project";

  return (
    <>
      <SEO 
        title="Additional Charge Payment - BlueTika" 
        description="Complete payment for additional work charges" 
      />
      
      <div className="min-h-screen flex flex-col">
        <div className="container max-w-2xl py-12 flex-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <CardTitle>Additional Charge Payment</CardTitle>
              </div>
              <CardDescription>
                {projectTitle}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#1B4FD8",
                    },
                  },
                }}
              >
                <CheckoutForm
                  chargeId={chargeId as string}
                  clientSecret={clientSecret}
                  chargeAmount={chargeAmount}
                  platformFee={platformFee}
                  processingFee={processingFee}
                  totalAmount={totalAmount}
                  commissionRate={commissionRate}
                  commissionAmount={commissionAmount}
                  netToProvider={netToProvider}
                  projectTitle={projectTitle}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
        
        <Footer />
      </div>
    </>
  );
}