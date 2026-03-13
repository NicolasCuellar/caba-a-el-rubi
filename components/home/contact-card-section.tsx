import Link from "next/link"
import { Phone, MessageCircle, MapPin, Instagram } from "lucide-react"
import { Button } from "@/components/ui/button"

const contacts = [
  {
    icon: Phone,
    label: "Telefono",
    value: "+57 300 123 4567",
    href: "tel:+573001234567",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Escribenos directo",
    href: "https://wa.me/573001234567?text=Hola%2C%20quiero%20reservar%20en%20La%20Caba%C3%B1a%20El%20Rub%C3%AD",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@cabanaelrubi",
    href: "https://instagram.com/cabanaelrubi",
  },
  {
    icon: MapPin,
    label: "Ubicacion",
    value: "Villarestrepo, Tolima",
    href: "https://maps.google.com/?q=Villarestrepo+Tolima+Colombia",
  },
]

export function ContactCardSection() {
  return (
    <section className="py-20 md:py-28 bg-primary">
      <div className="mx-auto max-w-4xl px-6">
        <div className="rounded-2xl bg-card p-8 shadow-2xl md:p-12">
          <div className="mb-10 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
              Contactanos
            </p>
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
              {"Estamos para ayudarte"}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {contacts.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-4 rounded-lg border border-border p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {c.value}
                  </p>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-10"
            >
              <Link href="/contacto">Ir a Contacto</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
