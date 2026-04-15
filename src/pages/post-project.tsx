import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { projectService } from "@/services/projectService";
import { categoryService } from "@/services/categoryService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

export default function PostProject() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    location: "",
    category_id: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await categoryService.getAllCategories();
    if (data) {
      setCategories(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check auth
    const session = await authService.getCurrentSession();
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to post a project",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    if (!formData.category_id) {
      toast({
        title: "Category required",
        description: "Please select a category for your project",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { data, error } = await projectService.createProject({
      title: formData.title,
      description: formData.description,
      budget: parseFloat(formData.budget),
      location: formData.location,
      client_id: session.user.id,
      status: "open",
      category_id: formData.category_id,
    });

    if (error) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      toast({
        title: "Project posted!",
        description: "Service providers can now bid on your project",
      });
      router.push(`/project/${data.id}`);
    }
    
    setLoading(false);
  };

  return (
    <>
      <SEO 
        title="Post a Project - BlueTika" 
        description="Post your project and receive bids from local New Zealand service providers." 
      />
      
      <div className="min-h-screen flex flex-col">
        <div className="container py-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>

          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Post a Project</h1>
              <p className="text-muted-foreground">
                Describe what you need done and receive bids from local service providers
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  All prices are in NZD. Be as specific as possible to receive quality bids.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Kitchen Renovation, Logo Design, Tax Return Help"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your project in detail. What needs to be done? Any specific requirements?"
                      rows={6}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (NZD)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="e.g. 5000"
                      min="1"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Your budget helps providers submit realistic bids
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. Auckland CBD, Wellington, Christchurch"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      required
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? "Posting..." : "Post Project"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Footer />
      </div>
    </>
  );
}