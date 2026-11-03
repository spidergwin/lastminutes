import Link from "next/link";
import { siteConfig } from "@/data/site";
import Image from "next/image";

export default function Logo() {
  return <>
 <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
            <Image 
              src="/logo.png" 
              alt="LM" 
              width={18} 
              height={18} 
              className="w-4.5 h-4.5" 
            />
          </div>
          <span className="text-lg font-bold tracking-tight font-[family-name:var(--font-display)]">
            {siteConfig.name}
          </span>
        </Link>

  </>
}
