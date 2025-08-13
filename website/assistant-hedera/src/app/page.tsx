import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LogoCarousel } from "@/components/carrousel";
import { HomeHeader } from "@/components/home-header";
import Image from "next/image";
import "./App.css";

function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HomeHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="relative">
          {/* Background Image */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/assets/bg1.png"
              alt=""
              className="w-full h-full object-cover opacity-70"
              style={{
                filter: "brightness(0.8) contrast(1.2)",
              }}
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/50" />
          </div>

          {/* Content */}
          <div className="container relative py-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center mb-8">
                <Image
                  src="/assets/hero.svg"
                  alt="InjectHive Hero"
                  className="w-[1024px] h-auto max-w-full"
                  style={{
                    filter: "drop-shadow(0 0 20px rgba(56, 189, 248, 0.2))",
                    animation: "float 6s ease-in-out infinite",
                  }}
                  width={1024}
                  height={1024}
                />
              </div>
              <style>
                {`
                                    @keyframes float {
                                        0%, 100% { transform: translateY(0px); }
                                        50% { transform: translateY(-10px); }
                                    }
                                `}
              </style>
              <div className="space-y-8">
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl font-black title-gradient"
                  style={{ lineHeight: "1.2" }}
                >
                  AI-Powered Trading Platform Optimize Your Profits
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Analyze data, predict market trends, and execute trades
                  automatically. Vistia optimizes profits, minimizes risks, and
                  removes emotions from trading.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    href="https://t.me/VistiaAIBot"
                    style={{ backgroundColor: "#7f00ff", color: "white" }}
                    className="hover:bg-[#7f00ff]/90 flex items-center gap-2 w-full sm:w-auto"
                  >
                    <span>Explore Agents</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    href="#AI_Chatbot"
                    className="border-[#27272A] hover:bg-[#7f00ff]/10 hover:border-[#7f00ff]/50 text-white w-full sm:w-auto"
                  >
                    Video Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="features" className="py-24 bg-background">
          <div className="container space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold title-gradient">
                Why Vistia AI Agent Systems?
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                A powerful multi-agent system optimizing blockchain & crypto
                trading with intelligent coordination:
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  title: "Price Prediction",
                  description: "Predict token prices in the near future.",
                  icon: "/assets/features/scalability.svg",
                  href: "#priceprediction",
                },
                {
                  title: "Trading Assistant",
                  description:
                    "AI chatbot and support for trading: swap, staking, more...",
                  icon: "/assets/features/efficiency.svg",
                  href: "#efficiency",
                },
                {
                  title: "Crypto Writer",
                  description:
                    "Aggregate & post the latest market updates on social media.",
                  icon: "/assets/features/specialization.svg",
                  href: "#specialization",
                },
                {
                  title: "AI Smart Money",
                  description:
                    "Optimizing your strategy for maximum efficiency ",
                  icon: "/assets/features/robustness.svg",
                  href: "#robustness",
                },
                {
                  title: "In the process of building.",
                  description: "Comming Soon.",
                  icon: "/assets/features/adaptability.svg",
                  href: "#adaptability",
                },
                {
                  title: "In the process of building.",
                  description: "Comming Soon.",
                  icon: "/assets/features/modularity.svg",
                  href: "#modularity",
                },
              ].map((feature, index) => {
                return (
                  <a key={index} href={feature.href} className="block group">
                    <Card className="bg-[#121212] border-[#27272A] hover:bg-[#1a1a1a] transition-colors h-full">
                      <div className="p-6 flex flex-col items-center text-center space-y-6">
                        <div className="h-20 w-20 rounded-2xl bg-[#1a1a1a] flex items-center justify-center group-hover:scale-110 transition-transform ring-1 ring-[#27272A]">
                          <Image
                            src={feature.icon}
                            alt={feature.title}
                            className="h-20 w-20"
                            width={1024}
                            height={1024}
                          />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-xl font-semibold text-[#7f00ff]">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="relative py-24">
          {/* Background Image */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/assets/bg2.png"
              alt=""
              className="w-full h-full object-cover opacity-70"
              style={{
                filter: "brightness(0.8) contrast(1.2)",
              }}
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/50" />
          </div>

          <div className="container relative space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold title-gradient">
                Advanced Multi-Agent System
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                A powerful multi-agent system optimizing blockchain & crypto
                trading with intelligent coordination.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="bg-[#121212] border-[#27272A] hover:bg-[#1a1a1a] transition-all duration-300 h-full group">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7f00ff] to-[#ff1492]">
                      User Interface
                    </span>
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Effortless access via Web App, Mobile App, and API, ensuring
                    a seamless trading experience.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-[#121212] border-[#27272A] hover:bg-[#1a1a1a] transition-all duration-300 h-full group">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7f00ff] to-[#ff1492]">
                      Command Center
                    </span>
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    The central intelligence that manages tasks and optimizes
                    communication between AI agents for peak efficiency.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-[#121212] border-[#27272A] hover:bg-[#1a1a1a] transition-all duration-300 h-full group">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7f00ff] to-[#ff1492]">
                      Smart Agents
                    </span>
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Dedicated AI agents for trading, market analysis, signals,
                    and automation—each fine-tuned for specific crypto tasks.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
            <div className="flex flex-col items-center space-y-8">
              <div className="w-full max-w-5xl bg-background rounded-lg p-8 border border-white/[0.08]">
                <Image
                  src="/architecture.png"
                  alt="InjectHive Architecture Diagram"
                  className="w-full h-auto"
                  width={1024}
                  height={1024}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Section with Logo Carousel */}
        <section className="py-24 space-y-12">
          <div className="container text-center space-y-4">
            <h2 className="text-3xl font-bold title-gradient">
              Connected Platforms & Protocols
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Effortlessly integrated with top platforms and protocols in the
              ecosystems
            </p>
          </div>
          <LogoCarousel />
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="container py-24 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold title-gradient">
              Flexible Solutions for Every Trader
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Explore Vistia AI Agents is a powerful platform that supports
              traders. Traders can customize input algorithms for certain AI
              Agents..
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: "Learner",
                price: "Free",
                description:
                  "Feature limitation. You can only use features at a restricted level.",
                buttonText: "View Documentation",
                href: "#github_link",
                featured: true,
              },
              {
                title: "Beginer",
                price: "$5",
                description:
                  "Public agents access, Basic features, limited API calls",
                buttonText: "Comming Soon.",
                comingSoon: true,
                href: "#",
              },
              {
                title: "Pro",
                price: "$10",
                description:
                  "Full features. Execute up to 2,000 buy/sell orders within 30 days.",
                buttonText: "Coming Soon",
                comingSoon: true,
                href: "#",
              },
              {
                title: "Master",
                price: "$18",
                description:
                  "Full features. Execute up to 5,000 buy/sell orders within 30 days.",
                buttonText: "Coming Soon",
                comingSoon: true,
                href: "#",
              },
            ].map((plan) => (
              <Card
                key={plan.title}
                className={`bg-[#121212] border-[#27272A] hover:bg-[#1a1a1a] transition-colors ${
                  plan.featured ? "ring-2 ring-[#7f00ff]" : ""
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-center">{plan.title}</CardTitle>
                  <div className="text-4xl font-bold my-4 text-center">
                    {plan.price}
                  </div>
                  <CardDescription className="text-center">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    className={`w-full ${
                      plan.featured
                        ? "bg-[#7f00ff] text-white hover:bg-[#7f00ff]/90"
                        : plan.comingSoon
                        ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                        : "border-[#27272A] hover:bg-[#1a1a1a] text-[#7f00ff]"
                    }`}
                    variant={plan.featured ? "default" : "outline"}
                    href={plan.comingSoon ? undefined : plan.href}
                    disabled={plan.comingSoon}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Coming Soon Notice */}
          <div className="text-center text-muted-foreground/90 mt-8">
            <p>
              The platform is under development. All features are currently
              provided for free.
            </p>
          </div>
        </section>

        {/* Open Source Section */}
        <section id="opensource" className="relative py-24">
          {/* Background Image */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/assets/bg3.png"
              alt=""
              className="w-full h-full object-cover opacity-70"
              style={{
                filter: "brightness(0.8) contrast(1.2)",
              }}
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/50" />
          </div>

          <div className="container relative space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold title-gradient">
                API Integration for DeFi
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Vistia provides powerful APIs for signals and indicators,
                enabling DeFi projects to enhance their trading capabilities.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="border-[#27272A] hover:bg-[#7f00ff]/10 hover:border-[#7f00ff]/50 hover:text-[#7f00ff] transition-all duration-300 w-full sm:w-auto"
                href="https://github.com/Vistia-AI/"
              >
                <Image
                  src="/assets/github-dark.svg"
                  alt="GitHub"
                  className="mr-2 h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity"
                  width={1024}
                  height={1024}
                />
                Contribute on GitHub
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-[#27272A] hover:bg-[#7f00ff]/10 hover:border-[#7f00ff]/50 hover:text-[#7f00ff] transition-all duration-300 w-full sm:w-auto"
                href="https://discord.gg/h7e5uxZRkP"
              >
                <Image
                  src="/assets/discord.svg"
                  alt="Discord"
                  className="mr-2 h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity"
                  width={1024}
                  height={1024}
                />
                Join Our Discord
              </Button>
            </div>
          </div>
        </section>

        {/* Social Media Section */}
        <section className="container py-24 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold title-gradient">
              Explore Our Trading Assistant
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Get real-time crypto insights, execute swaps, stake assets, and
              manage cross-chain transactions effortlessly with Trading
              Assistant.
            </p>
          </div>
          <div className="flex justify-center gap-8">
            <a
              href="https://discord.gg/25vDJZ3CCe"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="bg-[#121212] border-[#27272A] hover:bg-[#1a1a1a] transition-colors p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[#7f00ff] ring-offset-2 ring-offset-[#121212] group-hover:ring-4 transition-all duration-300">
                    <Image
                      src="/agents/Chat With Vistia.png"
                      alt="Vistia Agent"
                      width={1024}
                      height={1024}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold">Chat with Vistia</h3>
                    <p className="text-sm text-muted-foreground">
                      Chat with the Vistia founding team on Discord.
                    </p>
                  </div>
                </div>
              </Card>
            </a>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="relative py-24">
          {/* Background Image */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/assets/bg1.png"
              alt=""
              className="w-full h-full object-cover opacity-70"
              style={{
                filter: "brightness(0.8) contrast(1.2)",
              }}
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/50" />
          </div>

          <div className="container relative space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold title-gradient">
                Stay Informed with Our Crypto Writer
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Receive the latest market updates, key trading signals, and
                crypto trends curated. Stay ahead with automated, insightful
                content across social media platforms.
              </p>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[#7f00ff] ring-offset-2 ring-offset-[#121212] hover:ring-4 transition-all duration-300">
                <a
                  href="https://discord.gg/h7e5uxZRkP"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src="/agents/Chat With Discord.png"
                    alt="AI Sales Agent"
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                    width={1024}
                    height={1024}
                  />
                </a>
              </div>
              <Button
                size="lg"
                className="bg-[#7f00ff] text-white hover:bg-[#7f00ff]/90"
                href="https://discord.gg/h7e5uxZRkP"
              >
                <Image
                  src="/assets/discord.svg"
                  alt="Discord"
                  className="mr-2 h-5 w-5"
                  width={1024}
                  height={1024}
                />
                Track market information
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-background">
        <div className="mt-12 pt-8 border-t border-white/[0.08] text-center text-sm text-muted-foreground">
          © 2025 Vistia. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default Home;
