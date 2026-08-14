import React from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Code2,
  Globe,
  Headphones,
  Layers3,
  Palette,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";

const services = [
  ["Website Development", "Modern, responsive and high-performance websites designed around your brand and business goals.", Globe],
  ["Web Application Development", "Powerful custom web applications with modern interfaces, secure backends and scalable architecture.", Code2],
  ["Android Applications", "Custom Android applications designed for performance, usability and reliability.", Smartphone],
  ["iOS Applications", "Premium iOS applications built around intuitive user experiences and modern technologies.", Smartphone],
  ["Hybrid Applications", "Cross-platform applications that reduce development time while maintaining a polished native-like experience.", Layers3],
  ["Custom Software", "Tailored software solutions designed specifically around business workflows and requirements.", Server],
  ["UI/UX Design", "Clean, intuitive and conversion-focused interfaces designed for better user experiences.", Palette],
  ["Security Testing", "Security assessment and testing for websites and web applications to identify vulnerabilities and improve security.", ShieldCheck],
  ["Maintenance & Support", "Continuous updates, bug fixes, performance improvements and technical support after deployment.", Headphones],
];

export default function Services() {
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section id="services" className="section">

      <div className="container">

        <div className="section-heading">
          <span className="eyebrow">
            <Sparkles size={13} />
            What We Build
          </span>

          <h2>Technology Built Around Your Goals.</h2>

          <p>
            From your first idea to a production-ready digital product,
            we build solutions around your requirements, users and business
            objectives.
          </p>
        </div>

        <div className="service-grid">

          {services.map(([name, description, Icon], index) => (
            <motion.article
              key={name}
              className="service-card"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{
                duration: 0.55,
                delay: index * 0.035,
              }}
            >
              <div className="icon-box">
                <Icon size={22} />
              </div>

              <div className="card-number">
                0{index + 1}
              </div>

              <h3>{name}</h3>

              <p>{description}</p>

              <button onClick={scrollToContact}>
                Learn More
                <ArrowUpRight size={16} />
              </button>
            </motion.article>
          ))}

        </div>

      </div>

    </section>
  );
}