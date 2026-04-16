import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Ban, Shield, Clock, UserX, CheckCircle, Flag, FileCheck, TrendingUp, Trophy, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { contentSafetyService } from "@/services/contentSafetyService";
import { 
  getAllReports, 
  resolveReport, 
  reopenReport, 
  getReportStats,
  getReporterLeaderboard,
  getReporterHistory,
  type ReporterAnalytics,
  type ReportDetails
} from "@/services/reportService";

interface BypassAttempt {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  content: string;
  detected_patterns: string[];
  context: string;
  attempt_count: number;
  created_at: string;
}

interface SuspendedAccount {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  suspension_type: string;
  reason: string;
  suspended_at: string;
  suspended_until: string | null;
  is_active: boolean;
}

interface Report {
  id: string;
  reporter: { id: string; full_name: string | null; email: string | null };
  reported_user: { id: string; full_name: string | null; email: string | null } | null;
  reported_project: { id: string; title: string } | null;
  reason: string;
  note: string | null;
  status: string;
  outcome: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by_user: { id: string; full_name: string | null } | null;
}

export default function TrustAndSafety() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bypassAttempts, setBypassAttempts] = useState<BypassAttempt[]>([]);
  const [suspendedAccounts, setSuspendedAccounts] = useState<SuspendedAccount[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStats, setReportStats] = useState({ totalReports: 0, openReports: 0, resolvedReports: 0 });
  const [reporterLeaderboard, setReporterLeaderboard] = useState<ReporterAnalytics[]>([]);
  const [selectedReporter, setSelectedReporter] = useState<ReporterAnalytics | null>(null);
  const [reporterHistory, setReporterHistory] = useState<ReportDetails[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setIsAdmin(true);
    await loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [attempts, suspensions, allReports, stats, leaderboard] = await Promise.all([
        contentSafetyService.getAllBypassAttempts(),
        contentSafetyService.getAllSuspensions(),
        getAllReports(),
        getReportStats(),
        getReporterLeaderboard(),
      ]);

      const formattedAttempts: BypassAttempt[] = attempts.map(a => ({
        id: a.id,
        user_id: a.user_id,
        user_name: a.profile?.full_name || "Unknown",
        user_email: a.profile?.email || "Unknown",
        content: a.content_attempted,
        detected_patterns: a.detected_patterns,
        context: a.page_location,
        attempt_count: a.escalation_level,
        created_at: a.created_at,
      }));

      setBypassAttempts(formattedAttempts);
      setSuspendedAccounts(suspensions);
      setReports(allReports as Report[]);
      setReportStats(stats);
      setReporterLeaderboard(leaderboard);
    } catch (error) {
      console.error("Error loading trust & safety data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLiftSuspension = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("account_suspensions")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;

      toast({
        title: "Suspension Lifted",
        description: "The user's account has been reactivated.",
      });

      await loadData();
    } catch (error) {
      console.error("Error lifting suspension:", error);
      toast({
        title: "Error",
        description: "Failed to lift suspension",
        variant: "destructive",
      });
    }
  };

  const handleResolveReport = async (reportId: string, outcome: "actioned" | "dismissed") => {
    try {
      await resolveReport(reportId, outcome);
      toast({
        title: "Report Resolved",
        description: `The report has been marked as ${outcome}.`,
      });
      await loadData();
    } catch (error) {
      console.error("Error resolving report:", error);
      toast({
        title: "Error",
        description: "Failed to resolve report",
        variant: "destructive",
      });
    }
  };

  const handleReopenReport = async (reportId: string) => {
    try {
      await reopenReport(reportId);
      toast({
        title: "Report Reopened",
        description: "The report has been reopened for review.",
      });
      await loadData();
    } catch (error) {
      console.error("Error reopening report:", error);
      toast({
        title: "Error",
        description: "Failed to reopen report",
        variant: "destructive",
      });
    }
  };

  const handleViewReporterHistory = async (reporter: ReporterAnalytics) => {
    try {
      setSelectedReporter(reporter);
      const history = await getReporterHistory(reporter.reporter_id);
      setReporterHistory(history);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error loading reporter history:", error);
      toast({
        title: "Error",
        description: "Failed to load reporter history",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSuspensionBadge = (type: string) => {
    switch (type) {
      case "chat_suspension":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />24h Chat Ban</Badge>;
      case "auto_suspended":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-600"><AlertTriangle className="w-3 h-3 mr-1" />Auto-Suspended</Badge>;
      case "permanently_banned":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-600"><Ban className="w-3 h-3 mr-1" />Permanent Ban</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "spam":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-600">Spam</Badge>;
      case "fake":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-600">Fake</Badge>;
      case "other":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-600">Other</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "actioned":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600">Actioned</Badge>;
      case "dismissed":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-600">Dismissed</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-600">Pending</Badge>;
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <SEO title="Trust and Safety - BlueTika Admin" />
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-accent" />
              Trust and Safety
            </h1>
            <p className="text-muted-foreground">
              Monitor bypass attempts, manage suspended accounts, review user reports, and maintain platform integrity
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Escalation Policy:</strong> 1st = block, 2nd = warning flag, 3rd = 24h chat ban, 4th = auto-suspend, 5th = permanent ban
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="reports" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Reports ({reportStats.openReports})
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Reporter Analytics
              </TabsTrigger>
              <TabsTrigger value="attempts" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Bypass Attempts ({bypassAttempts.length})
              </TabsTrigger>
              <TabsTrigger value="suspensions" className="flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Suspended Accounts ({suspendedAccounts.filter(s => s.is_active).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>User Reports</CardTitle>
                  <CardDescription>
                    Community-submitted reports of spam, fake listings/profiles, and other violations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading...</p>
                  ) : reports.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">No reports submitted yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Outcome</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Reporter</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.map((report) => (
                            <TableRow key={report.id} className={report.status === "resolved" ? "opacity-50" : ""}>
                              <TableCell>
                                {report.status === "open" ? (
                                  <Badge variant="destructive">Open</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600">
                                    <FileCheck className="w-3 h-3 mr-1" />
                                    Resolved
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {getOutcomeBadge(report.outcome)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatDate(report.created_at)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{report.reporter.full_name || "Anonymous"}</p>
                                  <p className="text-xs text-muted-foreground">{report.reporter.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {report.reported_user ? (
                                  <div>
                                    <Badge variant="outline" className="mb-1">User</Badge>
                                    <p className="text-sm font-medium">{report.reported_user.full_name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{report.reported_user.email}</p>
                                  </div>
                                ) : report.reported_project ? (
                                  <div>
                                    <Badge variant="outline" className="mb-1">Project</Badge>
                                    <p className="text-sm">{report.reported_project.title}</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getReasonBadge(report.reason)}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {report.note ? (
                                  <p className="text-sm">{report.note}</p>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {report.status === "open" ? (
                                  <div className="flex gap-2">
                                    <Select onValueChange={(outcome) => handleResolveReport(report.id, outcome as "actioned" | "dismissed")}>
                                      <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Resolve..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="actioned">Actioned</SelectItem>
                                        <SelectItem value="dismissed">Dismissed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReopenReport(report.id)}
                                  >
                                    Reopen
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Reporter Leaderboard
                    </CardTitle>
                    <CardDescription>
                      Most active reporters with accuracy rates (actioned reports / total resolved reports)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-center py-8 text-muted-foreground">Loading...</p>
                    ) : reporterLeaderboard.length === 0 ? (
                      <div className="text-center py-12">
                        <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No reports filed yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>Reporter</TableHead>
                              <TableHead>Total Reports</TableHead>
                              <TableHead>Actioned</TableHead>
                              <TableHead>Dismissed</TableHead>
                              <TableHead>Pending</TableHead>
                              <TableHead>Accuracy Rate</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reporterLeaderboard.map((reporter, index) => (
                              <TableRow key={reporter.reporter_id} className={reporter.flagged_for_review ? "bg-destructive/5" : ""}>
                                <TableCell className="font-semibold">
                                  {index === 0 && <Trophy className="w-4 h-4 text-yellow-500 inline mr-1" />}
                                  {index === 1 && <Trophy className="w-4 h-4 text-gray-400 inline mr-1" />}
                                  {index === 2 && <Trophy className="w-4 h-4 text-amber-700 inline mr-1" />}
                                  #{index + 1}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{reporter.reporter_name}</p>
                                    <p className="text-xs text-muted-foreground">{reporter.reporter_email}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold">{reporter.total_reports}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600">
                                    {reporter.actioned_reports}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-600">
                                    {reporter.dismissed_reports}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-600">
                                    {reporter.pending_reports}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {reporter.accuracy_rate > 0 ? (
                                      <>
                                        <TrendingUp className={`w-4 h-4 ${reporter.accuracy_rate >= 70 ? "text-green-500" : reporter.accuracy_rate >= 50 ? "text-yellow-500" : "text-red-500"}`} />
                                        <span className={`font-semibold ${reporter.accuracy_rate >= 70 ? "text-green-600" : reporter.accuracy_rate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                                          {reporter.accuracy_rate}%
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {reporter.flagged_for_review && (
                                    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                      <AlertCircle className="w-3 h-3" />
                                      Review Required
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewReporterHistory(reporter)}
                                  >
                                    View History
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {reporterLeaderboard.filter(r => r.flagged_for_review).length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{reporterLeaderboard.filter(r => r.flagged_for_review).length} reporter(s)</strong> have more than 5 dismissed reports and require admin review
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attempts">
              <Card>
                <CardHeader>
                  <CardTitle>Bypass Attempt Log</CardTitle>
                  <CardDescription>
                    All attempts to share contact details, sorted by most recent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading...</p>
                  ) : bypassAttempts.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">No bypass attempts recorded</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Context</TableHead>
                            <TableHead>Detected Patterns</TableHead>
                            <TableHead>Attempt #</TableHead>
                            <TableHead>Content Sample</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bypassAttempts.map((attempt) => (
                            <TableRow key={attempt.id}>
                              <TableCell className="font-mono text-sm">
                                {formatDate(attempt.created_at)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{attempt.user_name}</p>
                                  <p className="text-xs text-muted-foreground">{attempt.user_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{attempt.context.replace(/_/g, " ")}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {attempt.detected_patterns.map((pattern, idx) => (
                                    <Badge key={idx} variant="destructive" className="text-xs">
                                      {pattern}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    attempt.attempt_count >= 5 ? "destructive" :
                                    attempt.attempt_count >= 3 ? "default" :
                                    "outline"
                                  }
                                >
                                  #{attempt.attempt_count}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="text-sm truncate text-muted-foreground">
                                  {attempt.content.substring(0, 60)}...
                                </p>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suspensions">
              <Card>
                <CardHeader>
                  <CardTitle>Suspended Accounts</CardTitle>
                  <CardDescription>
                    Active and historical account suspensions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading...</p>
                  ) : suspendedAccounts.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">No suspended accounts</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Suspended At</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suspendedAccounts.map((suspension) => (
                            <TableRow key={suspension.id} className={!suspension.is_active ? "opacity-50" : ""}>
                              <TableCell>
                                {suspension.is_active ? (
                                  <Badge variant="destructive">Active</Badge>
                                ) : (
                                  <Badge variant="outline">Lifted</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{suspension.user_name}</p>
                                  <p className="text-xs text-muted-foreground">{suspension.user_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getSuspensionBadge(suspension.suspension_type)}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="text-sm">{suspension.reason}</p>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatDate(suspension.suspended_at)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {suspension.suspended_until
                                  ? formatDate(suspension.suspended_until)
                                  : suspension.suspension_type === "permanently_banned"
                                  ? <span className="text-red-600 font-semibold">Never</span>
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {suspension.is_active && suspension.suspension_type !== "permanently_banned" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleLiftSuspension(suspension.user_id)}
                                  >
                                    Lift Suspension
                                  </Button>
                                )}
                                {suspension.suspension_type === "permanently_banned" && (
                                  <span className="text-xs text-muted-foreground">Permanent</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Reporter History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reporter History</DialogTitle>
            <DialogDescription>
              Complete report history for {selectedReporter?.reporter_name}
            </DialogDescription>
          </DialogHeader>

          {selectedReporter && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{selectedReporter.total_reports}</p>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-green-600">{selectedReporter.actioned_reports}</p>
                    <p className="text-sm text-muted-foreground">Actioned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-gray-600">{selectedReporter.dismissed_reports}</p>
                    <p className="text-sm text-muted-foreground">Dismissed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{selectedReporter.accuracy_rate}%</p>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporterHistory.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(report.created_at)}
                        </TableCell>
                        <TableCell>
                          {report.reported_user ? (
                            <div>
                              <Badge variant="outline" className="mb-1">User</Badge>
                              <p className="text-sm">{report.reported_user.full_name || "Unknown"}</p>
                            </div>
                          ) : report.reported_project ? (
                            <div>
                              <Badge variant="outline" className="mb-1">Project</Badge>
                              <p className="text-sm">{report.reported_project.title}</p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {getReasonBadge(report.reason)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {report.note || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {getOutcomeBadge(report.outcome)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}