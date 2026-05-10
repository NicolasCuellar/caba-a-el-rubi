"use client"

import { useState } from "react"
import { Send, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      asunto: formData.get("asunto"),
      mensaje: formData.get("mensaje"),
    }

    const message = `Hola, me comunico desde la web de La Cabana El Rubi.

Nombre: ${data.nombre}
Email: ${data.email}
Asunto: ${data.asunto}
Mensaje: ${data.mensaje}`

    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/573001234567?text=${encoded}`, "_blank")
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="mx-auto max-w-lg px-6 text-center">
          <div className="rounded-2xl bg-card p-10 shadow-lg">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-3 font-serif text-2xl font-bold text-foreground">
              Mensaje enviado
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Tu mensaje fue enviado por WhatsApp. Te responderemos lo antes posible.
            </p>
            <Button
              onClick={() => setSubmitted(false)}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Enviar otro mensaje
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="mx-auto max-w-lg px-6">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Escribenos
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
            Formulario de contacto
          </h2>
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-nombre" className="text-sm font-medium text-foreground">
                Nombre
              </Label>
              <Input
                id="contact-nombre"
                name="nombre"
                placeholder="Tu nombre"
                required
                className="bg-background"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                className="bg-background"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-asunto" className="text-sm font-medium text-foreground">
                Asunto
              </Label>
              <select
                id="contact-asunto"
                name="asunto"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Seleccionar asunto</option>
                <option value="Consulta sobre reservas">Consulta sobre reservas</option>
                <option value="Disponibilidad">Disponibilidad</option>
                <option value="Servicios adicionales">Servicios adicionales</option>
                <option value="Como llegar">Como llegar</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-mensaje" className="text-sm font-medium text-foreground">
                Mensaje
              </Label>
              <textarea
                id="contact-mensaje"
                name="mensaje"
                rows={4}
                placeholder="Escribe tu mensaje..."
                required
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 mt-2"
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar Mensaje
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
