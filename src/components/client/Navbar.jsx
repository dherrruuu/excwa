import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDeveloper } from "../../hooks/useDeveloper";
import excwaLogo from "../../assets/images/excwa-logo.png";

const links = [
  ["Home",      "home"],
  ["Services",  "services"],
  ["About",     "about"],
  ["Why EXCWA", "why"],
  ["Contact",   "contact"],
];

export default function Navbar() {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, devProfile, loading } = useDeveloper();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isDeveloperLoggedIn = !loading && user && devProfile?.status === "approved";

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="container nav-inner">

        {/* LOGO */}
        <button className="brand" onClick={() => goTo("home")} aria-label="EXCWA Tech Home">
          <img src={excwaLogo} alt="EXCWA Tech" className="brand-logo" />
          <span>EXCWA <b>Tech</b></span>
        </button>

        {/* NAV LINKS */}
        <nav className={`nav-links ${open ? "mobile-open" : ""}`}>
          {links.map(([label, id]) => (
            <button key={id} onClick={() => goTo(id)}>{label}</button>
          ))}

          {isDeveloperLoggedIn ? (
            <button
              className="nav-cta"
              onClick={() => { setOpen(false); navigate("/developer/dashboard"); }}
            >
              Dashboard
              <LayoutDashboard size={15} />
            </button>
          ) : (
            <button
              className="nav-cta"
              onClick={() => { setOpen(false); navigate("/developer/register"); }}
            >
              Join EXCWA
              <ArrowUpRight size={16} />
            </button>
          )}
        </nav>

        {/* MOBILE MENU TOGGLE */}
        <button
          className="menu-btn"
          onClick={() => setOpen((p) => !p)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>

      </div>
    </header>
  );
}