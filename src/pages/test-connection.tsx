import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

interface ConnectionTest {
  id: string;
  message: string;
  created_at: string;
}

export default function TestConnection() {
  const [data, setData] = useState<ConnectionTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: testData, error: fetchError } = await supabase
        .from("connection_test")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Supabase error:", fetchError);
        setError(fetchError.message);
      } else {
        setData(testData || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Supabase Connection Test</h1>
          <p className="text-muted-foreground">
            Verifying connection to new Vercel account and Supabase project
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Testing Connection...
                </>
              ) : error ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Connection Failed
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Connection Successful
                </>
              )}
            </CardTitle>
            <CardDescription>
              {error ? "There was an error connecting to Supabase" : "Fetching data from connection_test table"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm font-medium text-destructive mb-1">Error Details:</p>
                <p className="text-sm text-muted-foreground font-mono">{error}</p>
              </div>
            )}

            {!loading && !error && data.length === 0 && (
              <p className="text-muted-foreground">No test data found in the table.</p>
            )}

            {!loading && !error && data.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Test Messages from Database:</p>
                {data.map((item) => (
                  <div
                    key={item.id}
                    className="bg-muted/50 rounded-lg p-4 border border-border"
                  >
                    <p className="text-lg font-medium mb-1">{item.message}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {item.id} • Created: {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4">
              <Button onClick={fetchData} disabled={loading} variant="outline" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Test
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
            <CardDescription>Current environment configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Supabase URL:</div>
              <div className="text-muted-foreground font-mono truncate">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured"}
              </div>
              
              <div className="font-medium">Anon Key:</div>
              <div className="text-muted-foreground font-mono truncate">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configured ✓" : "Not configured ✗"}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Visit <a href="/" className="text-primary hover:underline">/</a> to return to home page</p>
        </div>
      </div>
    </div>
  );
}