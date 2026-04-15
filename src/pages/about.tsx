import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <>
      <SEO 
        title="About BlueTika - Our Story" 
        description="Learn about BlueTika, the trusted New Zealand reverse marketplace. Blue means trust, Tika means right." 
      />
      
      <div className="min-h-screen flex flex-col">
        {/* Navigation spacer */}
        <div className="container py-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-background py-16 md:py-24">
            <div className="container">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mb-6 flex justify-center">
                  {/* Koru Spiral Element */}
                  <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
                    <path d="M50 10C27.9 10 10 27.9 10 50C10 72.1 27.9 90 50 90C66.6 90 80.8 80 86.8 65.6C88 62.7 85.8 59.5 82.6 59.5C80 59.5 77.8 61.3 77.1 63.8C73.4 74 62.6 81.5 50 81.5C32.6 81.5 18.5 67.4 18.5 50C18.5 32.6 32.6 18.5 50 18.5C64.6 18.5 76.8 28.5 80.5 42C81.2 44.6 79.1 47 76.4 47C73.8 47 71.6 45.2 71 42.6C68.4 34 60 27.5 50 27.5C37.6 27.5 27.5 37.6 27.5 50C27.5 62.4 37.6 72.5 50 72.5C59.6 72.5 67.8 66.5 71.1 58" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                  </svg>
                </div>
                <h1 className="mb-6 text-4xl font-bold md:text-6xl text-primary">Kiwis Helping Kiwis</h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  We built a platform where trust is built-in, so you can focus on getting the job done right.
                </p>
              </div>
            </div>
          </section>

          {/* The Name Section */}
          <section className="bg-muted py-16">
            <div className="container">
              <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
                <div>
                  <h2 className="text-3xl font-bold mb-6">What does BlueTika mean?</h2>
                  <div className="space-y-6">
                    <div className="border-l-4 border-primary pl-6">
                      <h3 className="text-2xl font-bold text-primary mb-2">Blue</h3>
                      <p className="text-muted-foreground text-lg">
                        Represents trust, clarity, and professionalism. When you hire someone through our platform, you should feel completely confident in your choice.
                      </p>
                    </div>
                    <div className="border-l-4 border-accent pl-6">
                      <h3 className="text-2xl font-bold text-accent mb-2">Tika</h3>
                      <p className="text-muted-foreground text-lg">
                        Te reo Māori for "right, correct, true, fair." It's the standard we hold every transaction and interaction to. Do it right, do it fair.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-card p-10 rounded-2xl border border-border shadow-lg flex justify-center items-center">
                  <div className="text-center">
                    <span className="text-6xl font-bold text-white block mb-4">Blue<span className="text-primary">Tika</span></span>
                    <span className="text-accent font-medium tracking-widest uppercase">TRUST & TRUTH</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The Founder's Story */}
          <section className="py-20">
            <div className="container">
              <div className="max-w-3xl mx-auto">
                <div className="mb-10 text-center">
                  {/* Kiwi Bird Element */}
                  <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto text-primary mb-6">
                    <path d="M80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50C20 38.3093 26.6806 28.1787 36.6508 23.3106" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M50 20C66.5685 20 80 33.4315 80 50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="10 10"/>
                    <circle cx="65" cy="40" r="4" fill="currentColor"/>
                    <path d="M78 40C85 40 95 45 95 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    <path d="M40 80V90" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M60 80V90" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M35 90H45" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M55 90H65" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                  </svg>
                  <h2 className="text-3xl font-bold md:text-4xl">The Story Behind BlueTika</h2>
                </div>
                
                <div className="prose prose-lg dark:prose-invert mx-auto text-muted-foreground">
                  <p>
                    BlueTika wasn't born in a boardroom. It was born out of sheer frustration in a half-finished living room in Auckland.
                  </p>
                  <p>
                    Our founder hired a local builder for a major home renovation. The builder had a slick website, talked a big game, and demanded a significant deposit upfront. Two weeks into the job, after tearing down a load-bearing wall, the builder simply disappeared. Phone disconnected. Emails bounced. 
                  </p>
                  <p>
                    Leaving a family with a hazardous living room and thousands of dollars out of pocket.
                  </p>
                  <p>
                    When trying to find someone reliable to fix the mess, the options were terrible: scroll through endless social media groups hoping someone was trustworthy, or use directories that charged service providers massive lead fees just to quote on a job, driving up the final price.
                  </p>
                  <blockquote className="border-l-4 border-primary pl-6 italic my-8 text-foreground font-medium text-xl">
                    "There had to be a better way for Kiwis to find trustworthy help, and for honest tradespeople to build a reputation without being gouged on fees."
                  </blockquote>
                  <p>
                    That's when the concept for BlueTika was created. A reverse marketplace. Instead of scrolling through providers, you post your project. Providers come to you. You check their verified history, read real reviews from other Kiwis, and hire with confidence.
                  </p>
                  <p>
                    Today, BlueTika connects thousands of New Zealanders. Whether you need a builder who actually finishes the job, a designer for your new business, or an accountant who knows NZ tax law — we help you find local help, and get it done.
                  </p>
                </div>
                
                <div className="mt-16 text-center">
                  <Button size="lg" asChild className="px-8">
                    <Link href="/projects">Join the Community</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}