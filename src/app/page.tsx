import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Users, 
  PieChart, 
  Globe, 
  Zap, 
  Shield,
  Github,
  CheckCircle,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
            <Github className="w-4 h-4 mr-2" />
            Open Source • Free Forever
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            <span className="text-[hsl(280,100%,70%)]">Even</span> the Score
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            The modern way to split expenses with friends, roommates, and groups. 
            Track spending, settle debts, and keep everyone happy—all in one beautiful app.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/app">
              <Button size="lg" className="bg-[hsl(280,100%,70%)] hover:bg-[hsl(280,100%,60%)] text-white font-semibold px-8 py-4 text-lg">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/app">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg">
                Sign In
              </Button>
            </Link>
          </div>
          
          <div className="flex justify-center">
            <Button size="lg" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5 px-8 py-4 text-lg">
              <Github className="w-5 h-5 mr-2" />
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Powerful features designed to make expense splitting effortless and transparent.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Smart Splitting</h3>
              <p className="text-white/70">
                Automatically calculate who owes what with intelligent splitting algorithms. Equal splits, custom amounts, or percentage-based divisions.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Group Management</h3>
              <p className="text-white/70">
                Create groups for trips, households, or projects. Add friends, track group expenses, and manage multiple groups effortlessly.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Multi-Currency</h3>
              <p className="text-white/70">
                Support for 150+ currencies with real-time exchange rates. Perfect for international trips and global teams.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Expense Analytics</h3>
              <p className="text-white/70">
                Visualize spending patterns with beautiful charts and insights. Track categories, trends, and group spending habits.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Real-time Sync</h3>
              <p className="text-white/70">
                Instant updates across all devices. Add an expense and everyone in the group sees it immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Secure & Private</h3>
              <p className="text-white/70">
                Bank-level security with end-to-end encryption. Your financial data stays private and secure.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Three simple steps to start splitting expenses like a pro.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center text-2xl font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold">Add Friends</h3>
            <p className="text-white/70">
              Create groups and invite friends, roommates, or travel companions to join your expense tracking.
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center text-2xl font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold">Track Expenses</h3>
            <p className="text-white/70">
              Add expenses as they happen. Even automatically calculates who owes what and keeps running balances.
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-[hsl(280,100%,70%)] rounded-full flex items-center justify-center text-2xl font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold">Settle Up</h3>
            <p className="text-white/70">
              See who owes whom and settle debts with built-in payment tracking and balance optimization.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Perfect For</h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-4xl">🏠</div>
              <h3 className="font-semibold text-white">Roommates</h3>
              <p className="text-sm text-white/70">Split rent, utilities, groceries, and household expenses</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-4xl">✈️</div>
              <h3 className="font-semibold text-white">Travel Groups</h3>
              <p className="text-sm text-white/70">Track flights, hotels, meals, and activities on group trips</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-4xl">👥</div>
              <h3 className="font-semibold text-white">Friend Groups</h3>
              <p className="text-sm text-white/70">Dinners, events, shared subscriptions, and group activities</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-4xl">💼</div>
              <h3 className="font-semibold text-white">Teams</h3>
              <p className="text-sm text-white/70">Business lunches, office supplies, and project expenses</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Open Source */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold mb-4">Built in the Open</h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Even is completely open source. Contribute, customize, or self-host your own instance. 
            Transparency and community-driven development at its core.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="flex items-center space-x-3 justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span>100% Free Forever</span>
            </div>
            <div className="flex items-center space-x-3 justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span>Community Driven</span>
            </div>
            <div className="flex items-center space-x-3 justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span>Self-Hostable</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold">Ready to Get Even?</h2>
          <p className="text-xl text-white/70">
            Join thousands of users who have simplified their expense splitting with Even.
          </p>
          
          <Link href="/app">
            <Button size="lg" className="bg-[hsl(280,100%,70%)] hover:bg-[hsl(280,100%,60%)] text-white font-semibold px-12 py-6 text-xl">
              Start Tracking Expenses
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </Link>
          
          <p className="text-sm text-white/50">
            No credit card required • Sign up with Google, GitHub, or email
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-[hsl(280,100%,70%)]">Even</span>
              <span className="text-white/60">• Open Source Expense Splitting</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-white/60">
              <Link href="/app" className="hover:text-white transition-colors">App</Link>
              <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
              <Link href="#" className="hover:text-white transition-colors">Docs</Link>
              <Link href="#" className="hover:text-white transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}