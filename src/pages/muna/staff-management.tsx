import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, Shield, UserX, CheckCircle, Clock, AlertTriangle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { staffService } from "@/services/staffService";
import { isAdminUser } from "@/services/controlCentreService";

export default function StaffManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "verifier" });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const adminStatus = await isAdminUser();
    if (!adminStatus) {
      router.push("/muna");
      return;
    }

    setIsAdmin(true);
    await loadData();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffData, logsData] = await Promise.all([
        staffService.getAllStaff(),
        staffService.getAuditLogs(50),
      ]);

      setStaffList(staffData);
      setAuditLogs(logsData);
    } catch (error) {
      console.error("Error loading staff data:", error);
      toast({
        title: "Error",
        description: "Failed to load staff data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    if (!newStaff.email.endsWith("@bluetika.co.nz")) {
      toast({
        title: "Invalid Email",
        description: "Staff email must be @bluetika.co.nz domain",
        variant: "destructive",
      });
      return;
    }

    try {
      await staffService.inviteStaff(
        newStaff.name,
        newStaff.email,
        newStaff.role as "verifier" | "support" | "finance" | "moderator"
      );

      toast({
        title: "Invitation Sent",
        description: `${newStaff.name} has been invited. They will receive an email to set up their account.`,
      });

      setInviteDialogOpen(false);
      setNewStaff({ name: "", email: "", role: "verifier" });
      await loadData();
    } catch (error: any) {
      console.error("Error inviting staff:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite staff member",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (staffId: string, isActive: boolean) => {
    try {
      await staffService.updateStaffStatus(staffId, !isActive);
      toast({
        title: isActive ? "Staff Deactivated" : "Staff Activated",
        description: `Staff account has been ${isActive ? "deactivated" : "reactivated"}.`,
      });
      await loadData();
    } catch (error) {
      console.error("Error toggling staff status:", error);
      toast({
        title: "Error",
        description: "Failed to update staff status",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      verifier: "bg-blue-500/10 text-blue-600 border-blue-600",
      support: "bg-green-500/10 text-green-600 border-green-600",
      finance: "bg-purple-500/10 text-purple-600 border-purple-600",
      moderator: "bg-orange-500/10 text-orange-600 border-orange-600",
    };
    return (
      <Badge variant="outline" className={roleColors[role] || ""}>
        {staffService.getRoleDisplayName(role)}
      </Badge>
    );
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

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <SEO title="Staff Management - BlueTika Admin" />
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Users className="w-10 h-10 text-accent" />
                Staff Management
              </h1>
              <p className="text-muted-foreground">
                Invite and manage staff members with role-based access control
              </p>
            </div>
            <Button onClick={() => setInviteDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Invite Staff
            </Button>
          </div>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Staff invitations are sent via email. New staff members will receive a secure link to set up their @bluetika.co.nz account and access the Control Centre.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>All staff accounts with their roles and access levels</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : staffList.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No staff members yet</p>
                    <p className="text-sm text-muted-foreground">Invite your first staff member to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffList.map((member: any) => (
                          <TableRow key={member.id} className={!member.is_active ? "opacity-50" : ""}>
                            <TableCell>
                              {member.is_active ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-600">
                                  <UserX className="w-3 h-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>{getRoleBadge(member.role)}</TableCell>
                            <TableCell className="font-mono text-sm">{formatDate(member.created_at)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleStatus(member.id, member.is_active)}
                              >
                                {member.is_active ? "Deactivate" : "Activate"}
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

            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>Complete history of all staff actions across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No activity recorded yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Record Type</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">{formatDate(log.timestamp)}</TableCell>
                            <TableCell className="font-medium">{log.staff_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{log.record_type}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                              {JSON.stringify(log.details)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new staff member to the Control Centre
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="email">Email (@bluetika.co.nz)</Label>
              <Input
                id="email"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="john@bluetika.co.nz"
              />
              <p className="text-xs text-muted-foreground mt-1">Must be @bluetika.co.nz domain</p>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newStaff.role} onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verifier">
                    <div>
                      <div className="font-medium">Verifier</div>
                      <div className="text-xs text-muted-foreground">Reviews provider verification requests</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="support">
                    <div>
                      <div className="font-medium">Support Specialist</div>
                      <div className="text-xs text-muted-foreground">Handles disputes and user support</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="finance">
                    <div>
                      <div className="font-medium">Finance Manager</div>
                      <div className="text-xs text-muted-foreground">Manages fund releases and commissions</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div>
                      <div className="font-medium">Content Moderator</div>
                      <div className="text-xs text-muted-foreground">Reviews reports and content safety</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                An invitation email will be sent to this address with a secure signup link. They'll be able to access the Control Centre immediately after setting their password.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteStaff}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}