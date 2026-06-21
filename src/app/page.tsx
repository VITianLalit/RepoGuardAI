import Features from "@/components/home/Features";
import Hero from "@/components/home/Hero";
import StatusLogs from "@/components/home/StatusLogs";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header variant="landing" />
      <main>
        <Hero />
        <div id="features">
          <Features />
        </div>
        <div id="reasoning">
          <StatusLogs />
        </div>
      </main>
      <Footer />
    </div>
  );
}
