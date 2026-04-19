import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase, Search } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
            Find Local Help.
            <br />
            <span className="text-primary">Get it Done.</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600 md:text-xl">
            New Zealand's trusted marketplace connecting Kiwis with local service providers. Post your project or find work.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="gap-2">
              <Link href="/post-project">
                <Briefcase className="h-5 w-5" />
                Post a Project
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2">
              <Link href="/projects">
                <Search className="h-5 w-5" />
                Find Work
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}