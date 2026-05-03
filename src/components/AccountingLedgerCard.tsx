import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { accountingService } from "@/services/accountingService";
import { invoiceService } from "@/services/invoiceService";
import { Calculator, Plus, TrendingUp, TrendingDown, FileText, Download, Mail, Lock, Crown } from "lucide-react";
import type { AccountingEntry } from "@/services/accountingService";

interface AccountingLedgerCardProps {
  providerId: string;
  currentTier: "bronze" | "silver" | "gold" | "platinum";
}

export function AccountingLedgerCard({ providerId, currentTier }: AccountingLedgerCardProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    incomeWithGst: 0,
    expensesWithGst: 0
  });
  const [loading, setLoading] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [completedContracts, setCompletedContracts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    entryType: "income" as "income" | "expense",
    amount: "",
    gstIncluded: false,
    description: "",
    entryDate: new Date().toISOString().split("T")[0]
  });
  const [invoiceData, setInvoiceData] = useState({
    contractId: "",
    companyName: "",
    companyLogoUrl: "",
    customColors: { primary: "#1B4FD8", accent: "#06B6D4" }
  });

  const hasAccess = currentTier === "silver" || currentTier === "gold" || currentTier === "platinum";

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [providerId, hasAccess]);

  const loadData = async () => {
    try {
      const [entriesData, summaryData, contractsData] = await Promise.all([
        accountingService.getEntries(providerId),
        accountingService.getSummary(providerId),
        invoiceService.getCompletedContracts(providerId)
      ]);
      setEntries(entriesData);
      setSummary(summaryData);
      setCompletedContracts(contractsData);
    } catch (error) {
      console.error("Error loading accounting data:", error);
    }
  };

  const handleAddEntry = async () => {
    if (!formData.amount || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await accountingService.createEntry(providerId, {
        entryType: formData.entryType,
        amount: parseFloat(formData.amount),
        gstIncluded: formData.gstIncluded,
        description: formData.description,
        entryDate: formData.entryDate
      });
      toast({
        title: "Success",
        description: "Entry added successfully"
      });
      setEntryDialogOpen(false);
      setFormData({
        entryType: "income",
        amount: "",
        gstIncluded: false,
        description: "",
        entryDate: new Date().toISOString().split("T")[0]
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleCreateInvoice = async () => {
    if (!invoiceData.contractId || !invoiceData.companyName) {
      toast({
        title: "Error",
        description: "Please select a contract and provide company name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const invoiceNumber = await invoiceService.generateNextInvoiceNumber(providerId);
      await invoiceService.createInvoice(providerId, {
        contractId: invoiceData.contractId,
        companyName: invoiceData.companyName,
        companyLogoUrl: invoiceData.companyLogoUrl,
        invoiceNumber,
        issuedDate: new Date().toISOString().split("T")[0],
        customColors: invoiceData.customColors
      });
      toast({
        title: "Success",
        description: "Invoice created successfully. You can now download or email it."
      });
      setInvoiceDialogOpen(false);
      setInvoiceData({
        contractId: "",
        companyName: "",
        companyLogoUrl: "",
        customColors: { primary: "#1B4FD8", accent: "#06B6D4" }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Accounting Ledger
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Silver+
            </Badge>
          </CardTitle>
          <CardDescription>
            Track income, expenses, and generate invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Crown className="h-4 w-4" />
            <AlertDescription>
              <strong>Upgrade to Silver tier or higher</strong> to access accounting features including income/expense tracking and invoice generation.
            </AlertDescription>
          </Alert>
          <Button className="mt-4">Upgrade to Silver</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Accounting Ledger
              <Badge variant="default" className="gap-1">
                <Crown className="h-3 w-3" />
                Silver+
              </Badge>
            </CardTitle>
            <CardDescription>
              Track your business income and expenses
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Accounting Entry</DialogTitle>
                  <DialogDescription>
                    Record income or expense with optional GST
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="entryType">Type</Label>
                    <Select
                      value={formData.entryType}
                      onValueChange={(value: any) => setFormData({ ...formData, entryType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (NZD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gst">GST Included</Label>
                    <Switch
                      id="gst"
                      checked={formData.gstIncluded}
                      onCheckedChange={(checked) => setFormData({ ...formData, gstIncluded: checked })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What was this for?"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEntry} disabled={loading}>
                    {loading ? "Adding..." : "Add Entry"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                  <DialogDescription>
                    Generate an invoice from a completed BlueTika contract
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contract">Select Contract</Label>
                    <Select
                      value={invoiceData.contractId}
                      onValueChange={(value) => setInvoiceData({ ...invoiceData, contractId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a completed contract" />
                      </SelectTrigger>
                      <SelectContent>
                        {completedContracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.project_title} - ${contract.amount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={invoiceData.companyName}
                      onChange={(e) => setInvoiceData({ ...invoiceData, companyName: e.target.value })}
                      placeholder="Your Company Ltd"
                    />
                  </div>
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Invoice will include mandatory BlueTika footer with logo and "Thank you for choosing BlueTika." Can only be sent to client's registered BlueTika email.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={loading}>
                    {loading ? "Creating..." : "Create Invoice"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-success/10 border-success/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-success">${summary.totalIncome.toFixed(2)}</p>
                  {summary.incomeWithGst > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${summary.incomeWithGst.toFixed(2)} incl. GST
                    </p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-destructive">${summary.totalExpenses.toFixed(2)}</p>
                  {summary.expensesWithGst > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${summary.expensesWithGst.toFixed(2)} incl. GST
                    </p>
                  )}
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                  <p className="text-2xl font-bold text-primary">${summary.netAmount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Income - Expenses</p>
                </div>
                <Calculator className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Entries List */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Recent Entries</h3>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries yet. Add your first income or expense to get started.
            </div>
          ) : (
            entries.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{entry.description}</p>
                    <Badge variant={entry.entry_type === "income" ? "default" : "secondary"}>
                      {entry.entry_type}
                    </Badge>
                    {entry.gst_included && (
                      <Badge variant="outline">GST</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(entry.entry_date).toLocaleDateString()}
                  </p>
                </div>
                <p className={`text-lg font-bold ${
                  entry.entry_type === "income" ? "text-success" : "text-destructive"
                }`}>
                  {entry.entry_type === "income" ? "+" : "-"}${parseFloat(entry.amount as any).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}