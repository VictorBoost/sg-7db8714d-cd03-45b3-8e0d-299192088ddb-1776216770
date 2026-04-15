import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { projectService } from "@/services/projectService";
import { categoryService } from "@/services/categoryService";
import { subcategoryService } from "@/services/subcategoryService";
import type { Tables } from "@/integrations/supabase/types";

const NZ_LOCATIONS = [
  "Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga",
  "Dunedin", "Palmerston North", "Napier-Hastings", "Nelson", "Rotorua",
  "New Plymouth", "Whangarei", "Other NZ"
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PostProject() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [isDomesticHelper, setIsDomesticHelper] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    location: "",
    category_id: "",
    subcategory_id: "",
    booking_type: "one_time",
    selected_days: [] as string[],
    start_date: "",
    weeks_count: 1,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (formData.category_id) {
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      setIsDomesticHelper(selectedCategory?.slug === "domestic-helper");
      
      if (selectedCategory?.slug === "domestic-helper") {
        loadSubcategories(formData.category_id);
      } else {
        setSubcategories([]);
        setFormData(prev => ({ ...prev, subcategory_id: "", booking_type: "one_time" }));
      }
    }
  }, [formData.category_id, categories]);

  const loadCategories = async () => {
    const { data } = await categoryService.getActiveCategories();
    if (data) {
      setCategories(data);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    const { data } = await subcategoryService.getSubcategoriesByCategory(categoryId);
    if (data) {
      setSubcategories(data);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      selected_days: prev.selected_days.includes(day)
        ? prev.selected_days.filter(d => d !== day)
        : [...prev.selected_days, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check auth
    const session = await authService.getCurrentSession();
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please log in to post a project",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    // Validate Domestic Helper requirements
    if (isDomesticHelper && !formData.subcategory_id) {
      toast({
        title: "Subcategory required",
        description: "Please select a Domestic Helper subcategory",
        variant: "destructive",
      });
      return;
    }

    if (formData.booking_type === "routine") {
      if (formData.selected_days.length === 0) {
        toast({
          title: "Days required",
          description: "Please select at least one day of the week",
          variant: "destructive",
        });
        return;
      }
      if (!formData.start_date) {
        toast({
          title: "Start date required",
          description: "Please select a start date",
          variant: "destructive",
        });
        return;
      }
      if (formData.weeks_count < 1 || formData.weeks_count > 8) {
        toast({
          title: "Invalid weeks count",
          description: "Please select between 1 and 8 weeks",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    
    const projectData: any = {
      title: formData.title,
      description: formData.description,
      budget: parseFloat(formData.budget),
      location: formData.location,
      client_id: session.user.id,
      status: "open",
      category_id: formData.category_id,
    };

    if (isDomesticHelper) {
      projectData.subcategory_id = formData.subcategory_id;
      projectData.booking_type = formData.booking_type;
      
      if (formData.booking_type === "routine") {
        projectData.selected_days = formData.selected_days;
        projectData.start_date = formData.start_date;
        projectData.weeks_count = formData.weeks_count;
      }
    }

    const { data, error } = await projectService.createProject(projectData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Project posted successfully!",
      });
      router.push(`/project/${data.id}`);
    }
    
    setLoading(false);
  };

  return (
    <>
      <SEO 
        title="Post a Project - BlueTika"
        description="Post your project and receive bids from verified service providers across New Zealand"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-white">
          <div className="container py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              BlueTika
            </Link>
            <div className="flex gap-4">
              <Button variant="ghost" asChild>
                <Link href="/projects">Browse Projects</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 py-12">
          <div className="container max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">Post a Project</CardTitle>
                <CardDescription>
                  Describe your project and receive bids from verified service providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., House cleaning needed weekly"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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

                  {isDomesticHelper && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="subcategory">Service Type *</Label>
                        <Select
                          value={formData.subcategory_id}
                          onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            {subcategories.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="booking_type">Booking Type *</Label>
                        <Select
                          value={formData.booking_type}
                          onValueChange={(value) => setFormData({ ...formData, booking_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One-time booking</SelectItem>
                            <SelectItem value="routine">Routine schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.booking_type === "routine" && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted">
                          <div className="space-y-2">
                            <Label>Days of the Week *</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <div key={day} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`day-${day}`}
                                    checked={formData.selected_days.includes(day)}
                                    onCheckedChange={() => handleDayToggle(day)}
                                  />
                                  <Label htmlFor={`day-${day}`} className="font-normal cursor-pointer">
                                    {day}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="start_date">Start Date *</Label>
                              <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                min={new Date().toISOString().split("T")[0]}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="weeks_count">Number of Weeks (max 8) *</Label>
                              <Input
                                id="weeks_count"
                                type="number"
                                min="1"
                                max="8"
                                value={formData.weeks_count}
                                onChange={(e) => setFormData({ ...formData, weeks_count: parseInt(e.target.value) })}
                                required
                              />
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            Each session creates a separate contract with its own payment
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what you need done..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (NZD) *</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="500"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Select
                      value={formData.location}
                      onValueChange={(value) => setFormData({ ...formData, location: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your city or region" />
                      </SelectTrigger>
                      <SelectContent>
                        {NZ_LOCATIONS.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? "Posting..." : "Post Project"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push("/projects")}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}