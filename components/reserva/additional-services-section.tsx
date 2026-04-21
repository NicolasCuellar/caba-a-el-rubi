import { Heart, PartyPopper, ShoppingBasket, PawPrint, UtensilsCrossed } from "lucide-react"
const services = [
  {
    icon: UtensilsCrossed,
    title: "Desayunos Especiales",
    price: "$25.000 por persona",
    description:
      "Desayuno con ingredientes frescos de la region. Incluye jugo natural, fruta, huevos al gusto, pan artesanal y cafe de la zona.",
  },
  {
    icon: Heart,
    title: "Decoracion Romantica",
    price: "$60.000",
    description:
      "Petalos de rosa, velas aromaticas, globos y un detalle especial para sorprender a tu pareja. Ideal para aniversarios o propuestas.",
  },
  {
    icon: PartyPopper,
    title: "Decoracion de Cumpleanos",
    price: "$80.000",
    description:
      "Decoracion festiva con globos, letreros personalizados y detalles tematicos. Hacemos tu celebracion especial en la montana.",
  },
  {
    icon: ShoppingBasket,
    title: "Picnic Adicional",
    price: "$85.000",
    description:
      "Una sola vez por reserva. Disfruta de un picnic especial en medio de la naturaleza con productos locales.",
  },
  {
    icon: PawPrint,
    title: "Pet Friendly (mascota)",
    price: "$15.000 c/u",
    description:
      "Por cada mascota, unica vez por reserva. Trae a tu companero peludo y disfruten juntos de la montana.",
  },
  {
    icon: UtensilsCrossed,
    title: "Desayuno Adicional",
    price: "$20.000 c/u",
    description:
      "Por persona adicional que lo solicite. Desayuno fresco con ingredientes de la region.",
  },
]

export function AdditionalServicesSection() {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Extras
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
            Servicios Adicionales
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Agrega estas experiencias a tu reserva para hacer tu estadia aun mas especial.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-1 font-serif text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mb-3 text-sm font-semibold text-accent">{s.price}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
