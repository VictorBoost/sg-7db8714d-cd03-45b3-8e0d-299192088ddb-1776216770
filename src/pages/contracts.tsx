import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { contractService } from "@/services/contractService";
import { googleCalendarService } from "@/services/googleCalendarService";
import { routineContractService } from "@/services/routineContractService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Loader2, Clock, MapPin, Star, Calendar as CalendarIcon } from "lucide-react";
import { ProgressSteps } from "@/components/ProgressSteps";
import { EvidencePhotoUpload } from "@/components/EvidencePhotoUpload";
import { ReviewSubmissionModal } from "@/components/ReviewSubmissionModal";
import { RoutineContractPrompt } from "@/components/RoutineContractPrompt";
import { toast } from "@/hooks/use-toast";
import { SafetyBanner } from "@/components/SafetyBanner";

type Contract = any;
type RoutineBooking = any;
type AdditionalCharge = any;

export default function ContractsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [routineContracts, setRoutineContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [routinePromptOpen, setRoutinePromptOpen] = useState(false);
  const [routinePromptContract, setRoutinePromptContract] = useState<any>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  async function checkUserAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    setUser(user);
    
    // Check Google Calendar connection
    const connected = await googleCalendarService.isConnected(user.id);
    setCalendarConnected(connected);
    
    await loadContracts(user.id);
    await loadRoutineContracts(user.id);
  }

  async function loadContracts(userId: string) {
    const { data, error } = await contractService.getUserContracts(userId);

    if (error) {
      console.error("Error loading contracts:", error);
      toast({
        title: "Load Failed",
        description: "Could not load your contracts.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    setContracts(data || []);
    setLoading(false);
  }

  async function loadRoutineContracts(userId: string) {
    // Load as client
    const { data: clientRoutines } = await routineContractService.getActiveRoutines(userId, "client");
    // Load as provider
    const { data: providerRoutines } = await routineContractService.getActiveRoutines(userId, "provider");
    
    const allRoutines = [...(clientRoutines || []), ...(providerRoutines || [])];
    setRoutineContracts(allRoutines);
  }

  function handleOpenReviewModal(contract: any) {
    setSelectedContract(contract);
    setReviewModalOpen(true);
  }

  function handleReviewSubmitted() {
    if (user) {
      loadContracts(user.id);
    }
  }

  function handleRoutinePromptTrigger() {
    if (selectedContract) {
      setRoutinePromptContract(selectedContract);
      setRoutinePromptOpen(true);
    }
  }

  async function handleConnectGoogleCalendar() {
    if (!user) return;
    
    const authUrl = googleCalendarService.getAuthUrl(user.id);
    window.location.href = authUrl;
  }

  async function handleSyncToCalendar(contract: any) {
    if (!user || !calendarConnected) return;

    setSyncingCalendar(contract.id);

    try {
      const userRole = contract.client_id === user.id ? "client" : "provider";
      const otherPartyName = userRole === "client" 
        ? contract.provider?.full_name || "Service Provider"
        : contract.client?.full_name || "Client";

      await googleCalendarService.createContractEvent(
        user.id,
        contract.id,
        contract.project.title,
        otherPartyName,
        contract.agreed_start_date,
        contract.project.address,
        userRole === "client"
      );

      toast({
        title: "Added to Calendar",
        description: "This contract has been added to your Google Calendar."
      });

      loadContracts(user.id);
    } catch (error) {
      console.error("Error syncing to calendar:", error);
      toast({
        title: "Sync Failed",
        description: "Could not add to Google Calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncingCalendar(null);
    }
  }

  async function handlePauseRoutine(routineId: string) {
    const { error } = await routineContractService.pauseRoutine(routineId);
    
    if (error) {
      toast({
        title: "Action Failed",
        description: "Could not pause routine.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Routine Paused",
      description: "All future sessions have been cancelled."
    });

    if (user) loadRoutineContracts(user.id);
  }

  async function handleCancelRoutine(routineId: string) {
    const { error } = await routineContractService.cancelRoutine(routineId);
    
    if (error) {
      toast({
        title: "Action Failed",
        description: "Could not cancel routine.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Routine Cancelled",
      description: "This routine arrangement has been cancelled permanently."
    });

    if (user) loadRoutineContracts(user.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Contracts</h1>
          <p className="text-muted-foreground">Track your ongoing projects and agreements</p>
        </div>

        {!calendarConnected && (
          <Card className="mb-6 border-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Connect Google Calendar
              </CardTitle>
              <CardDescription>
                Add your contracts to Google Calendar to get automatic reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConnectGoogleCalendar}>
                Connect Calendar
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Contracts</TabsTrigger>
            <TabsTrigger value="routine">Routine Arrangements ({routineContracts.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : contracts.filter(c => c.status !== "Completed" && c.status !== "Awaiting Fund Release").length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No active contracts found
                </CardContent>
              </Card>
            ) : (
              contracts
                .filter(c => c.status !== "Completed" && c.status !== "Awaiting Fund Release")
                .map((contract) => {
                  const isClient = contract.client_id === user?.id;
                  const otherParty = isClient ? contract.provider : contract.client;
                  
                  return (
                    <Card key={contract.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{contract.project?.title || 'Unknown Project'}</CardTitle>
                            <CardDescription>
                              {isClient ? "Service Provider" : "Client"}: {otherParty?.full_name}
                            </CardDescription>
                          </div>
                          <Badge>{contract.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ProgressSteps steps={[
                          { label: "Active", status: contract.status === "active" ? "active" : "completed" },
                          { label: "Work Done", status: contract.status === "Work Completed" ? "active" : (contract.status === "Evidence Uploaded" || contract.status === "Completed" || contract.status === "Awaiting Fund Release" ? "completed" : "upcoming") },
                          { label: "Completed", status: contract.status === "Completed" || contract.status === "Awaiting Fund Release" ? "completed" : "upcoming" }
                        ]} />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Agreed Price</p>
                            <p className="font-semibold">${contract.final_amount?.toFixed(2) || contract.agreed_price?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Start Date</p>
                            <p className="font-semibold">
                              {contract.agreed_start_date ? new Date(contract.agreed_start_date).toLocaleDateString("en-NZ") : "Not Set"}
                            </p>
                          </div>
                        </div>

                        {calendarConnected && !contract.google_calendar_event_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncToCalendar(contract)}
                            disabled={syncingCalendar === contract.id}
                          >
                            {syncingCalendar === contract.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CalendarIcon className="w-4 h-4 mr-2" />
                            )}
                            Add to Calendar
                          </Button>
                        )}

                        {/* Evidence upload for provider when Work Completed */}
                        {!isClient && contract.status === "Work Completed" && (
                          <EvidencePhotoUpload
                            contractId={contract.id}
                            photoType="after"
                            uploaderRole="provider"
                            currentPhotos={[]}
                            currentStatus="not_uploaded"
                            otherPartyStatus="not_uploaded"
                            onUpdate={() => loadContracts(user!.id)}
                          />
                        )}

                        {/* Review submission when evidence uploaded */}
                        {contract.status === "Evidence Uploaded" && (
                          <Button onClick={() => handleOpenReviewModal(contract)}>
                            Submit Review
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </TabsContent>

          <TabsContent value="routine" className="space-y-4">
            {routineContracts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No routine arrangements found
                </CardContent>
              </Card>
            ) : (
              routineContracts.map((routine) => {
                const isClient = routine.client_id === user?.id;
                const otherParty = isClient ? routine.provider : routine.client;
                
                return (
                  <Card key={routine.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{routine.project.title}</CardTitle>
                          <CardDescription>
                            {isClient ? "Service Provider" : "Client"}: {otherParty?.full_name}
                          </CardDescription>
                        </div>
                        <Badge className="bg-green-600">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Frequency</p>
                          <p className="font-semibold capitalize">{routine.frequency}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Start Date</p>
                          <p className="font-semibold">
                            {new Date(routine.start_date).toLocaleDateString("en-NZ")}
                          </p>
                        </div>
                      </div>

                      {routine.selected_days && routine.selected_days.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Days of Week:</p>
                          <div className="flex gap-2 flex-wrap">
                            {routine.selected_days.map((day: string) => (
                              <Badge key={day} variant="outline">
                                {day.charAt(0).toUpperCase() + day.slice(1)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseRoutine(routine.id)}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelRoutine(routine.id)}
                        >
                          Cancel Routine
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {contracts.filter(c => c.status === "Completed" || c.status === "Awaiting Fund Release").length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No completed contracts found
                </CardContent>
              </Card>
            ) : (
              contracts
                .filter(c => c.status === "Completed" || c.status === "Awaiting Fund Release")
                .map((contract) => {
                  const isClient = contract.client_id === user?.id;
                  const otherParty = isClient ? contract.provider : contract.client;
                  
                  return (
                    <Card key={contract.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{contract.project.title}</CardTitle>
                            <CardDescription>
                              {isClient ? "Service Provider" : "Client"}: {otherParty?.full_name}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">{contract.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Final Price</p>
                            <p className="font-semibold">${contract.agreed_price?.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Completed</p>
                            <p className="font-semibold">
                              {new Date(contract.updated_at).toLocaleDateString("en-NZ")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Submission Modal */}
      {selectedContract && (
        <ReviewSubmissionModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedContract(null);
          }}
          contractId={selectedContract.id}
          clientId={selectedContract.client_id}
          providerId={selectedContract.provider_id}
          reviewerRole={selectedContract.client_id === user?.id ? "client" : "provider"}
          revieweeName={
            selectedContract.client_id === user?.id
              ? selectedContract.provider?.full_name || "Provider"
              : selectedContract.client?.full_name || "Client"
          }
          projectTitle={selectedContract.project.title}
          onReviewSubmitted={handleReviewSubmitted}
          onRoutinePromptTrigger={handleRoutinePromptTrigger}
        />
      )}

      {/* Routine Contract Prompt */}
      {routinePromptContract && (
        <RoutineContractPrompt
          isOpen={routinePromptOpen}
          onClose={() => {
            setRoutinePromptOpen(false);
            setRoutinePromptContract(null);
          }}
          contractId={routinePromptContract.id}
          projectId={routinePromptContract.project_id}
          clientId={routinePromptContract.client_id}
          providerId={routinePromptContract.provider_id}
          clientName={routinePromptContract.client?.full_name || "Client"}
          providerName={routinePromptContract.provider?.full_name || "Provider"}
          projectTitle={routinePromptContract.project.title}
          userRole={routinePromptContract.client_id === user?.id ? "client" : "provider"}
          isDomesticHelper={routinePromptContract.project.category_id === "domestic-helper"}
        />
      )}
    </div>
  );
}