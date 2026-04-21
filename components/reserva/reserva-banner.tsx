import Image from "next/image"

export function ReservaBanner() {
  return (
    <section className="relative flex h-[50vh] min-h-[360px] items-center justify-center overflow-hidden">
      <Image
        src="/images/columpio.jpeg" //tu descanso comieza aqui.jpeg
        alt="Vista desde la terraza de una cabana en Villarestrepo"
        fill
        className="object-cover object-[left_50%]"
        priority
        quality={85}
      />
      <div className="absolute inset-0 bg-foreground/50" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-primary-foreground/80">
          Reserva tu estadia
        </p>
        <h1 className="mb-4 max-w-3xl font-serif text-4xl font-bold text-primary-foreground md:text-5xl lg:text-6xl text-balance">
          Tu descanso comienza aqui
        </h1>
        <p className="max-w-lg text-base font-light text-primary-foreground/80">
          {"Elige tu cabana ideal, agrega servicios especiales y asegura tu lugar en la montana."}
        </p>
      </div>
    </section>
  )
}
