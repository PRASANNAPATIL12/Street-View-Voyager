import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-blue-100 dark:from-slate-900 dark:to-blue-950">
      <header className="py-6 px-4 md:px-8 shadow-md bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-headline font-bold text-primary">Street View Voyager</h1>
          <Button variant="outline" asChild>
            <a href="#install-extension">
              <Chrome className="mr-2 h-5 w-5" /> Get Extension
            </a>
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-12 md:py-20">
        <section className="text-center mb-16 md:mb-24">
          <h2 className="text-5xl md:text-6xl font-headline font-extrabold mb-6 text-foreground">
            Drive the World from Your Browser
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Experience Google Maps Street View like never before. Overlay a 3D vehicle, take control, and cruise through global streets with realistic physics and immersive sound.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <a href="#features">Learn More</a>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <a href="https://github.com/your-repo/street-view-voyager" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </section>

        <section id="features" className="mb-16 md:mb-24">
          <h3 className="text-4xl font-headline font-bold text-center mb-12 text-foreground">Why You'll Love Voyager</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <Image src="https://placehold.co/600x400.png?text=3D+Overlay" alt="3D Model Overlay" width={600} height={400} className="rounded-t-lg object-cover aspect-video" data-ai-hint="map 3d car" />
                <CardTitle className="mt-4 font-headline">Interactive 3D Overlay</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Seamlessly places high-quality 3D vehicle models directly onto Street View panoramas.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <Image src="https://placehold.co/600x400.png?text=Controls" alt="Customizable Controls" width={600} height={400} className="rounded-t-lg object-cover aspect-video" data-ai-hint="keyboard game controller" />
                <CardTitle className="mt-4 font-headline">Realistic Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Intuitive keyboard controls for acceleration, braking, and steering. Customize key bindings to your preference.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <Image src="https://placehold.co/600x400.png?text=Sound+FX" alt="Dynamic Audio" width={600} height={400} className="rounded-t-lg object-cover aspect-video" data-ai-hint="headphones sound wave" />
                <CardTitle className="mt-4 font-headline">Immersive Sound</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Dynamic engine sounds, horn, and ambient street noise make your virtual drive more engaging.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="install-extension" className="bg-card p-8 md:p-12 rounded-lg shadow-2xl text-center">
          <h3 className="text-4xl font-headline font-bold mb-6 text-card-foreground">Get Started with Voyager</h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Ready to explore? Install the Street View Voyager Chrome Extension and start your journey today.
            It's free and easy to set up!
          </p>
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6">
            <Chrome className="mr-3 h-6 w-6" /> Download Extension
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            (Links to Chrome Web Store or GitHub releases)
          </p>
        </section>
      </main>

      <footer className="text-center py-8 border-t border-border bg-background/50">
        <p className="text-muted-foreground">&copy; {new Date().getFullYear()} Street View Voyager. All rights reserved.</p>
      </footer>
    </div>
  );
}
