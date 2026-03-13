import Link from "next/link"
import { Phone, MessageCircle, Instagram, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground py-12 text-background/80">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-4 block">
              <span className="font-serif text-2xl font-bold text-background">
                La Cabana{" "}
              </span>
              <span className="font-serif text-sm italic text-accent">
                El Rubi
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-background/60">
              Descansa, desconectate y vive la magia de la naturaleza
              en el corazon del cañon del Combeima.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background">
              Navegacion
            </h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className="text-sm text-background/60 transition-colors hover:text-background"
              >
                Inicio
              </Link>
              <Link
                href="/reserva"
                className="text-sm text-background/60 transition-colors hover:text-background"
              >
                Reservar
              </Link>
              <Link
                href="/contacto"
                className="text-sm text-background/60 transition-colors hover:text-background"
              >
                Contacto
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background">
              Contacto
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+573001234567"
                className="flex items-center gap-2 text-sm text-background/60 transition-colors hover:text-background"
              >
                <Phone className="h-4 w-4" />
                +57 300 123 4567
              </a>
              <a
                href="https://wa.me/573001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-background/60 transition-colors hover:text-background"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href="https://instagram.com/cabanaelrubi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-background/60 transition-colors hover:text-background"
              >
                <Instagram className="h-4 w-4" />
                @cabanaelrubi
              </a>
              <div className="flex items-center gap-2 text-sm text-background/60">
                <MapPin className="h-4 w-4" />
                Villarestrepo, Tolima
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-background/10 pt-6 text-center text-xs text-background/40">
          {"© 2026 La Cabana El Rubi. Todos los derechos reservados."}
        </div>
      </div>
    </footer>
  )
}
