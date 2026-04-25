import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Bot, FileText, DollarSign, CheckCircle2, Star, RefreshCw, Filter } from "lucide-react";

interface BotActivityLog {
  id: string;
  bot_id: string;
  action_type: string;
  details: any;
  created_at: string;
  bot_profile?: {
    full_name: string;
    email: string;
  };
}

interface ActivityStats {
  total: number;
  post_project: number;
  submit_bid: number;
  accept_bid: number;
  complete_work: number;
  submit_review: number;
  make_payment: number;
}

export default function BotActivityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<BotActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    post_project: 0,
    submit_bid: 0,
    accept_bid: 0,
    complete_work: 0,
    submit_review: 0,
    make_payment: 0,
  });
  const [filterType, setFilterType] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadActivities();
    }
  }, [filterType]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadActivities();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filterType]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/verify-admin");
      if (!response.ok) {
        router.push("/muna/login");
        return;
      }
      setLoading(false);
    } catch (error) {
      console.error("Auth check failed", error);
      router.push("/muna/login");
    }
  };

  const loadActivities = async () => {
    try {
      let query = supabase
        .from("bot_activity_logs")
        .select(`
          id,
          bot_id,
          action_type,
          details,
          created_at,
          bot_profile:profiles!bot_activity_logs_bot_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterType !== "all") {
        query = query.eq("action_type", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(log => ({
        ...log,
        bot_profile: Array.isArray(log.bot_profile) ? log.bot_profile[0] : log.bot_profile
      })) || [];

      setActivities(formattedData);

      // Calculate stats
      const { data: allLogs } = await supabase
        .from("bot_activity_logs")
        .select("action_type");

      if (allLogs) {
        const newStats = {
          total: allLogs.length,
          post_project: allLogs.filter(l => l.action_type === "post_project").length,
          submit_bid: allLogs.filter(l => l.action_type === "submit_bid").length,
          accept_bid: allLogs.filter(l => l.action_type === "accept_bid").length,
          complete_work: allLogs.filter(l => l.action_type === "complete_work").length,
          submit_review: allLogs.filter(l => l.action_type === "submit_review").length,
          make_payment: allLogs.filter(l => l.action_type === "make_payment").length,
        };
        setStats(newStats);
      }
    } catch (error: any) {
      console.error("Error loading activities:", error);
      toast({
        title: "Error",
        description: "Failed to load bot activities",
        variant: "destructive",
      });
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "post_project":
        return <FileText className="h-4 w-4" />;
      case "submit_bid":
        return <Activity className="h-4 w-4" />;
      case "accept_bid":
        return <CheckCircle2 className="h-4 w-4" />;
      case "complete_work":
        return <CheckCircle2 className="h-4 w-4" />;
      case "submit_review":
        return <Star className="h-4 w-4" />;
      case "make_payment":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case "post_project":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "submit_bid":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "accept_bid":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "complete_work":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "submit_review":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "make_payment":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const formatDetails = (details: any) => {
    if (!details) return "—";
    const items = [];
    if (details.project_id) items.push(`Project: ${details.project_id.slice(0, 8)}...`);
    if (details.bid_id) items.push(`Bid: ${details.bid_id.slice(0, 8)}...`);
    if (details.contract_id) items.push(`Contract: ${details.contract_id.slice(0, 8)}...`);
    if (details.amount) items.push(`$${details.amount}`);
    if (details.rating) items.push(`${details.rating}★`);
    return items.join(" • ") || JSON.stringify(details);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Bot Activity Dashboard - Muna Control Centre"
        description="Monitor real-time bot activities including bids, contracts, and payments"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-muted/30 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/muna" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">
                  ← Back to Control Centre
                </Link>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Bot className="h-8 w-8 text-primary" />
                  Bot Activity Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Real-time monitoring of all bot actions
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="auto-refresh" className="text-sm">
                    Auto-refresh (30s)
                  </Label>
                </div>
                <Button onClick={loadActivities} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Activities</CardDescription>
                <CardTitle className="text-2xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Projects
                </CardDescription>
                <CardTitle className="text-2xl">{stats.post_project}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Bids
                </CardDescription>
                <CardTitle className="text-2xl">{stats.submit_bid}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Accepted
                </CardDescription>
                <CardTitle className="text-2xl">{stats.accept_bid}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Payments
                </CardDescription>
                <CardTitle className="text-2xl">{stats.make_payment}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </CardDescription>
                <CardTitle className="text-2xl">{stats.complete_work}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Star className="h-3 w-3" /> Reviews
                </CardDescription>
                <CardTitle className="text-2xl">{stats.submit_review}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Filter by action type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="post_project">Post Project</SelectItem>
                    <SelectItem value="submit_bid">Submit Bid</SelectItem>
                    <SelectItem value="accept_bid">Accept Bid</SelectItem>
                    <SelectItem value="make_payment">Make Payment</SelectItem>
                    <SelectItem value="complete_work">Complete Work</SelectItem>
                    <SelectItem value="submit_review">Submit Review</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  Showing {activities.length} activities
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest 100 bot actions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Bot</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No activities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString("en-NZ", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{activity.bot_profile?.full_name || "Unknown Bot"}</div>
                            <div className="text-muted-foreground text-xs">{activity.bot_profile?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionBadgeColor(activity.action_type)}>
                            {getActionIcon(activity.action_type)}
                            <span className="ml-1.5">{formatActionType(activity.action_type)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDetails(activity.details)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}