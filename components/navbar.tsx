"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Reservar", href: "/reserva" },
  { label: "Contacto", href: "/contacto" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-card/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className={`block -translate-x-1 transition-colors duration-300 sm:-translate-x-2 ${
            scrolled ? "text-primary" : "text-primary-foreground"
          }`}
          aria-label="La Cabana El Rubi"
        >
          <span
            aria-hidden="true"
            className="block h-[4.75rem] w-[15rem] bg-current [mask:url('/logo-el-rubi.svg')_center/contain_no-repeat] [-webkit-mask:url('/logo-el-rubi.svg')_center/contain_no-repeat] sm:h-[5.5rem] sm:w-[17rem]"
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-300 hover:opacity-80 ${
                scrolled ? "text-foreground" : "text-primary-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/reserva#formulario">
              <Phone className="mr-2 h-4 w-4" />
              Reservar Ahora
            </Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`md:hidden transition-colors ${
            scrolled ? "text-foreground" : "text-primary-foreground"
          }`}
          aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-card/95 backdrop-blur-md px-6 pb-6 pt-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block py-3 text-sm font-medium text-foreground border-b border-border/50 last:border-0"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/reserva#formulario" onClick={() => setIsOpen(false)}>
              <Phone className="mr-2 h-4 w-4" />
              Reservar Ahora
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
