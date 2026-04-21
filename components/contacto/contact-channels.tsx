import { Phone, MessageCircle, Instagram, Mail, MapPin, Clock } from "lucide-react"

const channels = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    value: "+57 300 123 4567",
    description: "Respuesta inmediata. Escribenos y te atendemos al instante.",
    href: "https://wa.me/573001234567?text=Hola%2C%20quiero%20informacion%20sobre%20La%20Caba%C3%B1a%20El%20Rub%C3%AD",
    accent: true,
  },
  {
    icon: Phone,
    title: "Telefono",
    value: "+57 300 123 4567",
    description: "Llamanos para consultas rapidas o reservas directas.",
    href: "tel:+573001234567",
  },
  {
    icon: Mail,
    title: "Email",
    value: "reservas@cabanaelrubi.com",
    description: "Para consultas detalladas o solicitudes especiales.",
    href: "mailto:reservas@cabanaelrubi.com",
  },
  {
    icon: Instagram,
    title: "Instagram",
    value: "@cabanaelrubi",
    description: "Siguenos para ver fotos, promociones y testimonios.",
    href: "https://instagram.com/cabanaelrubi",
  },
  {
    icon: MapPin,
    title: "Ubicacion",
    value: "Villarestrepo, Tolima",
    description: "A 30 min de Ibague. Via principal, 500m del parque central.",
    href: "https://maps.google.com/?q=Villarestrepo+Tolima+Colombia",
  },
  {
    icon: Clock,
    title: "Horarios",
    value: "Lun - Dom: 7am - 9pm",
    description: "Atencion todos los dias. Check-in desde las 3pm, check-out hasta las 12pm.",
  },
]

export function ContactChannels() {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Canales de contacto
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
            Multiples formas de comunicarte
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((c) => {
            const Wrapper = c.href ? "a" : "div"
            const linkProps = c.href
              ? {
                  href: c.href,
                  target: c.href.startsWith("http") ? "_blank" as const : undefined,
                  rel: c.href.startsWith("http") ? "noopener noreferrer" : undefined,
                }
              : {}

            return (
              <Wrapper
                key={c.title}
                {...linkProps}
                className={`group flex flex-col rounded-xl border p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  c.accent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background"
                }`}
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${
                    c.accent ? "bg-primary-foreground/20" : "bg-primary/10"
                  }`}
                >
                  <c.icon className={`h-5 w-5 ${c.accent ? "text-primary-foreground" : "text-primary"}`} />
                </div>
                <h3
                  className={`mb-1 font-serif text-lg font-semibold ${
                    c.accent ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {c.title}
                </h3>
                <p
                  className={`mb-2 text-sm font-medium ${
                    c.accent ? "text-primary-foreground/90" : "text-foreground"
                  }`}
                >
                  {c.value}
                </p>
                <p
                  className={`text-xs leading-relaxed ${
                    c.accent ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {c.description}
                </p>
              </Wrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
}
