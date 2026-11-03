import { Download } from "@/components/sections/download";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-amber-500/30">
      <Navbar />
      <main className="pt-20">
        <Download />
      </main>
      <Footer />
    </div>
  );
}
