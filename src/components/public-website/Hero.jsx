import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  Globe,
  Layers3,
  Smartphone,
} from "lucide-react";

export default function Hero() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section id="home" className="hero">

      <div className="container hero-grid">

        <div className="hero-copy">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="pill">
              <span className="pulse-dot" />
              DIGITAL SYSTEMS / BUILT FOR MOMENTUM
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
          >
            We engineer the{" "}
            <span>technology</span>{" "}
            behind ambitious growth.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            EXCWA - TECH helps enterprises and high-growth companies build
            faster, scale smarter, and turn complex technology into measurable
            advantage.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
          >
            <button
              className="primary-btn"
              onClick={() => scrollTo("contact")}
            >
              Start a Conversation
              <ArrowRight size={18} />
            </button>

            <button
              className="secondary-btn"
              onClick={() => scrollTo("services")}
            >
              Explore Capabilities
              <ArrowRight size={17} />
            </button>
          </motion.div>

          <motion.div
            className="hero-trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <CheckCircle2 size={16} />
            Practical technology. Clean development. Long-term support.
          </motion.div>

        </div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="architecture-card">

            <div className="window-top">
              <span />
              <span />
              <span />
              <small>excwa.system</small>
            </div>

            <div className="architecture-body">

              <div className="node node-main">
                <Code2 size={22} />
                <b>Digital Product</b>
                <small>Built for scale</small>
              </div>

              <div className="connection c1" />
              <div className="connection c2" />
              <div className="connection c3" />

              <div className="node node-one">
                <Globe size={18} />
                <span>Web</span>
              </div>

              <div className="node node-two">
                <Smartphone size={18} />
                <span>Mobile</span>
              </div>

              <div className="node node-three">
                <Database size={18} />
                <span>Backend</span>
              </div>

              <div className="floating-chip chip-one">
                SECURE
              </div>

              <div className="floating-chip chip-two">
                SCALABLE
              </div>

              <div className="floating-chip chip-three">
                FAST
              </div>

            </div>
          </div>
        </motion.div>

      </div>

      <div className="hero-bottom-fade" />

    </section>
  );
}