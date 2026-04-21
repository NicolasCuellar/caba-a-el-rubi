import Image from "next/image"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  const useVideo = true

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {useVideo ? (
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover object-[center_43%] pointer-events-none"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/banner.jpeg"
          aria-hidden="true"
        >
          <source src="/videos/cabana-el-rubi-dron.mp4" type="video/mp4" />
        </video>
      ) : (
        <Image
          src="/images/banner.jpeg"
          alt="Vista panoramica de La Cabana El Rubi en Villarestrepo"
          fill
          className="object-cover object-[center_43%]"
          priority
          quality={90}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 z-[1] bg-foreground/45" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <p className="animate-fade-in-up mb-4 font-sans text-sm font-medium uppercase tracking-[0.3em] text-primary-foreground/80">
          Villarestrepo, Tolima &mdash; Colombia
        </p>
        <h1 className="animate-fade-in-up-delay-1 mb-6 max-w-4xl font-serif text-4xl font-bold leading-tight text-primary-foreground md:text-6xl lg:text-7xl text-balance">
          {"Escapate a la tranquilidad en Villarestrepo"}
        </h1>
        <p className="animate-fade-in-up-delay-2 mb-10 max-w-xl text-base font-light leading-relaxed text-primary-foreground/85 md:text-lg">
          {"Cabanas acogedoras rodeadas de naturaleza, montanas y aire puro. Tu refugio ideal para descansar."}
        </p>
        <div className="animate-fade-in-up-delay-3 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-base font-semibold"
          >
            <Link href="/reserva#formulario">Reservar Ahora</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground px-8 py-6 text-base"
          >
            <Link href="/reserva">Conocer Cabanas</Link>
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-8 w-8 text-primary-foreground/60" />
      </div>
    </section>
  )
}
