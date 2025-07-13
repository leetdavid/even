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
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <Badge
            variant="secondary"
            className="border-white/20 bg-white/10 text-white"
          >
            <Github className="mr-2 h-4 w-4" />
            Open Source • Free Forever
          </Badge>

          <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">
            <span className="text-[hsl(280,100%,70%)]">Even</span> the Score
          </h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-white/80 md:text-2xl">
            The modern way to split expenses with friends, roommates, and
            groups. Track spending, settle debts, and keep everyone happy—all in
            one beautiful app.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/app">
              <Button
                size="lg"
                className="bg-[hsl(280,100%,70%)] px-8 py-4 text-lg font-semibold text-white hover:bg-[hsl(280,100%,60%)]"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/app">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 px-8 py-4 text-lg text-white hover:bg-white/10"
              >
                Sign In
              </Button>
            </Link>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              variant="ghost"
              className="px-8 py-4 text-lg text-white/60 hover:bg-white/5 hover:text-white"
            >
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold">Everything You Need</h2>
          <p className="mx-auto max-w-2xl text-xl text-white/70">
            Powerful features designed to make expense splitting effortless and
            transparent.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(280,100%,70%)]">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Smart Splitting
              </h3>
              <p className="text-white/70">
                Automatically calculate who owes what with intelligent splitting
                algorithms. Equal splits, custom amounts, or percentage-based
                divisions.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(280,100%,70%)]">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Group Management
              </h3>
              <p className="text-white/70">
                Create groups for trips, households, or projects. Add friends,
                track group expenses, and manage multiple groups effortlessly.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(280,100%,70%)]">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Multi-Currency
              </h3>
              <p className="text-white/70">
                Support for 150+ currencies with real-time exchange rates.
                Perfect for international trips and global teams.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(280,100%,70%)]">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Expense Analytics
              </h3>
              <p className="text-white/70">
                Visualize spending patterns with beautiful charts and insights.
                Track categories, trends, and group spending habits.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(280,100%,70%)]">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Real-time Sync
              </h3>
              <p className="text-white/70">
                Instant updates across all devices. Add an expense and everyone
                in the group sees it immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(280,100%,70%)]">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Secure & Private
              </h3>
              <p className="text-white/70">
                Bank-level security with end-to-end encryption. Your financial
                data stays private and secure.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold">How It Works</h2>
          <p className="mx-auto max-w-2xl text-xl text-white/70">
            Three simple steps to start splitting expenses like a pro.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(280,100%,70%)] text-2xl font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold">Add Friends</h3>
            <p className="text-white/70">
              Create groups and invite friends, roommates, or travel companions
              to join your expense tracking.
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(280,100%,70%)] text-2xl font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold">Track Expenses</h3>
            <p className="text-white/70">
              Add expenses as they happen. Even automatically calculates who
              owes what and keeps running balances.
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(280,100%,70%)] text-2xl font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold">Settle Up</h3>
            <p className="text-white/70">
              See who owes whom and settle debts with built-in payment tracking
              and balance optimization.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold">Perfect For</h2>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-3 p-6 text-center">
              <div className="text-4xl">🏠</div>
              <h3 className="font-semibold text-white">Roommates</h3>
              <p className="text-sm text-white/70">
                Split rent, utilities, groceries, and household expenses
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-3 p-6 text-center">
              <div className="text-4xl">✈️</div>
              <h3 className="font-semibold text-white">Travel Groups</h3>
              <p className="text-sm text-white/70">
                Track flights, hotels, meals, and activities on group trips
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-3 p-6 text-center">
              <div className="text-4xl">👥</div>
              <h3 className="font-semibold text-white">Friend Groups</h3>
              <p className="text-sm text-white/70">
                Dinners, events, shared subscriptions, and group activities
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="space-y-3 p-6 text-center">
              <div className="text-4xl">💼</div>
              <h3 className="font-semibold text-white">Teams</h3>
              <p className="text-sm text-white/70">
                Business lunches, office supplies, and project expenses
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Open Source */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <h2 className="mb-4 text-4xl font-bold">Built in the Open</h2>
          <p className="mx-auto max-w-2xl text-xl text-white/70">
            Even is completely open source. Contribute, customize, or self-host
            your own instance. Transparency and community-driven development at
            its core.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span>100% Free Forever</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span>Community Driven</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span>Self-Hostable</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl space-y-8 text-center">
          <h2 className="text-4xl font-bold">Ready to Get Even?</h2>
          <p className="text-xl text-white/70">
            Join thousands of users who have simplified their expense splitting
            with Even.
          </p>

          <Link href="/app">
            <Button
              size="lg"
              className="bg-[hsl(280,100%,70%)] px-12 py-6 text-xl font-semibold text-white hover:bg-[hsl(280,100%,60%)]"
            >
              Start Tracking Expenses
              <ArrowRight className="ml-2 h-6 w-6" />
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
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-[hsl(280,100%,70%)]">
                Even
              </span>
              <span className="text-white/60">
                • Open Source Expense Splitting
              </span>
            </div>

            <div className="flex items-center space-x-6 text-sm text-white/60">
              <Link href="/app" className="transition-colors hover:text-white">
                App
              </Link>
              <Link href="#" className="transition-colors hover:text-white">
                GitHub
              </Link>
              <Link href="#" className="transition-colors hover:text-white">
                Docs
              </Link>
              <Link href="#" className="transition-colors hover:text-white">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
