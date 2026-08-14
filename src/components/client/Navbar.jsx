import React, { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import excwaLogo from "../../assets/images/excwa-logo.png";

const links = [
  ["Home", "home"],
  ["Services", "services"],
  ["About", "about"],
  ["Why EXCWA", "why"],
  ["Contact", "contact"],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const goTo = (id) => {
    setOpen(false);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="container nav-inner">

        {/* LOGO */}
        <button
          className="brand"
          onClick={() => goTo("home")}
          aria-label="EXCWA Tech Home"
        >
          <img
    src={excwaLogo}
    alt="EXCWA Tech"
    className="brand-logo"
  />

          <span>
            EXCWA <b>Tech</b>
          </span>
        </button>

        {/* DESKTOP / MOBILE NAV */}
        <nav className={`nav-links ${open ? "mobile-open" : ""}`}>
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => goTo(id)}
            >
              {label}
            </button>
          ))}

          <button
            className="nav-cta"
            onClick={() => goTo("contact")}
          >
            Start Your Project
            <ArrowUpRight size={16} />
          </button>
        </nav>

        {/* MOBILE MENU */}
        <button
          className="menu-btn"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>

      </div>
    </header>
  );
}