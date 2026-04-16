import { useState } from "react";
import { createReport } from "@/services/reportService";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "user" | "project";
  targetId: string;
  targetName: string;
}

export function ReportModal({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
}: ReportModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<"spam" | "fake" | "other">("spam");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (note.length > 100) {
      toast({
        title: "Note too long",
        description: "Please keep your note under 100 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createReport({
        ...(targetType === "user"
          ? { reportedUserId: targetId }
          : { reportedProjectId: targetId }),
        reason,
        note: note.trim() || undefined,
      });

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep BlueTika safe. Our team will review this report.",
      });

      onOpenChange(false);
      setReason("spam");
      setNote("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Failed to submit report",
        description: "Please try again or contact support if the problem persists",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Report {targetType === "user" ? "User" : "Project"}
          </DialogTitle>
          <DialogDescription>
            Report <span className="font-medium">{targetName}</span> for violating BlueTika&apos;s
            community standards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Reason for report</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam" className="font-normal cursor-pointer">
                  Spam
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fake" id="fake" />
                <Label htmlFor="fake" className="font-normal cursor-pointer">
                  Fake {targetType === "user" ? "profile" : "listing"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="font-normal cursor-pointer">
                  Other violation
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">
              Additional details <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="note"
              placeholder="Provide any additional context (max 100 characters)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={100}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {note.length}/100 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}