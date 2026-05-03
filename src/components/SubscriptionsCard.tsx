import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { subscriptionService } from "@/services/subscriptionService";
import { CreditCard, Star, Mail, Link as LinkIcon, Users, Calendar, AlertCircle } from "lucide-react";
import type { SubscriptionPlan, ProviderSubscription } from "@/services/subscriptionService";

interface SubscriptionsCardProps {
  providerId: string;
}

export function SubscriptionsCard({ providerId }: SubscriptionsCardProps) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProviderSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalMonthly, setTotalMonthly] = useState(0);

  useEffect(() => {
    loadData();
  }, [providerId]);

  const loadData = async () => {
    try {
      const [plansData, subsData, total] = await Promise.all([
        subscriptionService.getAvailablePlans(),
        subscriptionService.getProviderSubscriptions(providerId),
        subscriptionService.getTotalMonthlyBilling(providerId)
      ]);
      setPlans(plansData);
      setSubscriptions(subsData);
      setTotalMonthly(total);
    } catch (error) {
      console.error("Error loading subscription data:", error);
    }
  };

  const handleSubscribe = async (planId: string, monthlyPrice: number) => {
    setLoading(true);
    try {
      // Calculate prorated amount for first payment
      const billingDate = new Date().getDate();
      const proratedAmount = await subscriptionService.calculateProratedAmount(monthlyPrice, billingDate);

      toast({
        title: "Redirecting to payment",
        description: `First payment: $${proratedAmount.toFixed(2)} (prorated + next 30 days)`
      });

      // In production, this would redirect to Stripe Checkout
      // For now, just show a message
      alert(`Stripe integration required. First payment would be $${proratedAmount.toFixed(2)}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process subscription",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription? The feature will remain active until the end of your billing period.")) {
      return;
    }

    try {
      await subscriptionService.cancelSubscription(subscriptionId);
      toast({
        title: "Success",
        description: "Subscription cancelled. Access continues until end of billing period."
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive"
      });
    }
  };

  const getPlanIcon = (featureKey: string) => {
    switch (featureKey) {
      case "remove_logo":
        return <Star className="h-5 w-5" />;
      case "email_hosting":
        return <Mail className="h-5 w-5" />;
      case "custom_url":
        return <LinkIcon className="h-5 w-5" />;
      case "staff_member":
        return <Users className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const isSubscribed = (featureKey: string) => {
    return subscriptions.some((sub: any) => sub.subscription_plans.feature_key === featureKey);
  };

  const getNextBillingDate = () => {
    if (subscriptions.length === 0) return null;
    const billingDate = subscriptions[0].billing_date;
    const today = new Date();
    const nextBilling = new Date(today.getFullYear(), today.getMonth() + 1, billingDate);
    return nextBilling.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscriptions
        </CardTitle>
        <CardDescription>
          Enhance your service provider profile with additional features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Billing Summary */}
        {subscriptions.length > 0 && (
          <>
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <strong>Next billing date:</strong> {getNextBillingDate()}
                {" · "}
                <strong>Total monthly:</strong> ${totalMonthly.toFixed(2)}
              </AlertDescription>
            </Alert>
            <Separator />
          </>
        )}

        {/* Available Plans */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Available Subscriptions</h3>
          {plans.map((plan) => {
            const subscribed = isSubscribed(plan.feature_key);
            const subscription = subscriptions.find((sub: any) => sub.subscription_plans.feature_key === plan.feature_key);

            return (
              <div
                key={plan.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                  {getPlanIcon(plan.feature_key)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{plan.name}</p>
                      {subscribed && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <p className="text-sm font-medium text-primary">
                      ${parseFloat(plan.monthly_price as any).toFixed(2)}/month
                    </p>
                  </div>
                </div>
                <div>
                  {subscribed ? (
                    <Button
                      variant="outline"
                      onClick={() => handleCancelSubscription(subscription!.id)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan.id, parseFloat(plan.monthly_price as any))}
                      disabled={loading}
                    >
                      Subscribe
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>First payment is prorated:</strong> Remaining days in current period + next 30 days. All subscriptions share one billing date. Failed payments receive a 3-day grace period before feature suspension.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}