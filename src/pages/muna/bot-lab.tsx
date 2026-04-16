import { useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bot, Trash2, Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { botLabService } from "@/services/botLabService";
import { useToast } from "@/hooks/use-toast";

export default function BotLab() {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await botLabService.getBotStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load bot stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleGenerateBots = async () => {
    setIsGenerating(true);
    try {
      const result = await botLabService.generateBots(50);
      
      toast({
        title: "Bot Generation Complete",
        description: `Successfully created ${result.success} bots. ${result.failed > 0 ? `${result.failed} failed.` : ""}`,
      });

      if (result.errors.length > 0) {
        console.error("Bot generation errors:", result.errors);
      }

      // Reload stats
      await loadStats();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveBots = async () => {
    setIsRemoving(true);
    try {
      const result = await botLabService.removeBots(50);
      
      toast({
        title: "Bot Removal Complete",
        description: `Successfully removed ${result.success} bots. ${result.failed > 0 ? `${result.failed} failed.` : ""}`,
      });

      if (result.errors.length > 0) {
        console.error("Bot removal errors:", result.errors);
      }

      // Reload stats
      await loadStats();
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <SEO 
        title="Bot Lab - BlueTika Control Centre"
        description="Generate and manage test data bots"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => router.push("/muna")}
              className="mb-4"
            >
              ← Back to Control Centre
            </Button>
            
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Bot Lab</h1>
            </div>
            <p className="text-muted-foreground">
              Generate realistic test data to populate the marketplace
            </p>
          </div>

          {/* Warning Banner */}
          <Alert className="mb-6 border-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-600 dark:text-yellow-400">
              Bot accounts create realistic marketplace activity but cannot interact with real users. All bot data is clearly marked and can be batch deleted.
            </AlertDescription>
          </Alert>

          {/* Control Panel */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Generate 50 Bots
                </CardTitle>
                <CardDescription>
                  Creates 50 new bot accounts (40% providers, 60% clients) with realistic NZ names, locations, and bios. Bots will post listings, submit bids, create contracts, upload photos, and leave reviews.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateBots}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? "Generating..." : "Generate 50 Bots"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Remove 50 Bots
                </CardTitle>
                <CardDescription>
                  Deletes 50 bot accounts and all their content (listings, bids, contracts, photos, reviews). Real user data is never affected. If fewer than 50 bots exist, removes all remaining bots.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleRemoveBots}
                  disabled={isRemoving || (stats && stats.totalBots === 0)}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  {isRemoving ? "Removing..." : "Remove 50 Bots"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats Panel */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Bot Analytics
                </CardTitle>
                <Button
                  onClick={loadStats}
                  disabled={loadingStats}
                  variant="outline"
                  size="sm"
                >
                  {loadingStats ? "Loading..." : "Refresh Stats"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!stats && !loadingStats && (
                <p className="text-muted-foreground text-center py-8">
                  Click "Refresh Stats" to load bot analytics
                </p>
              )}

              {loadingStats && (
                <p className="text-muted-foreground text-center py-8">
                  Loading analytics...
                </p>
              )}

              {stats && (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Total Active Bots</p>
                      <p className="text-3xl font-bold">{stats.totalBots}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Provider Bots</p>
                      <p className="text-3xl font-bold text-primary">{stats.providerBots}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Client Bots</p>
                      <p className="text-3xl font-bold text-accent">{stats.clientBots}</p>
                    </div>
                  </div>

                  {/* Error Log */}
                  {Object.keys(stats.errorSummary || {}).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Error Summary
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(stats.errorSummary).map(([error, count]: [string, any]) => (
                          <div key={error} className="flex items-center justify-between bg-muted rounded p-3">
                            <span className="text-sm">{error}</span>
                            <Badge variant="destructive">{count} occurrences</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Errors */}
                  {stats.recentErrors && stats.recentErrors.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Recent Errors (Last 20)</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {stats.recentErrors.map((error: any, idx: number) => (
                          <div key={idx} className="text-sm bg-muted rounded p-2">
                            <span className="font-medium">{error.action_type}:</span>{" "}
                            <span className="text-muted-foreground">{error.error_message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.totalBots === 0 && (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No active bots. Click "Generate 50 Bots" to get started.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bot Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>✓ Bots have realistic NZ names and locations</p>
                <p>✓ Bots post listings with realistic descriptions and pricing</p>
                <p>✓ Bots submit bids on other bots' listings</p>
                <p>✓ Bots accept bids and create contracts</p>
                <p>✓ Bots upload placeholder before/after photos</p>
                <p>✓ Bots leave star ratings and written reviews</p>
                <p>✓ Bots stop at Stripe payment step (no real payments)</p>
                <p>✗ Bots never respond to real user interactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Safety & Visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>✓ Bot content is fully visible to real users</p>
                <p>✓ Bot accounts look identical to real accounts</p>
                <p>✓ Bots are clearly marked in the database</p>
                <p>✓ All bot data can be batch deleted</p>
                <p>✓ Real user data is never affected by bot operations</p>
                <p>✓ Bot generation is tracked and logged</p>
                <p>✓ Error handling prevents database corruption</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}