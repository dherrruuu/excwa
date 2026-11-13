import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const technologies = [
  "HTML",
  "CSS",
  "JavaScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "Android",
  "Flutter",
  "PostgreSQL",
  "MySQL",
  "Git",
  "Docker",
];

export default function Technologies() {
  return (
    <section className="section tech-section">
      <div className="container">

        <div className="section-heading">
          <span className="eyebrow">
            <Sparkles size={13} />
            Technology Stack
          </span>

          <h2>Built With Modern Technology.</h2>

          <p>
            A flexible technology toolkit for building modern digital
            products.
          </p>
        </div>

        <div className="tech-grid">
          {technologies.map((technology, index) => (
            <motion.div
              key={technology}
              className="tech-badge"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.025,
              }}
            >
              <span className="tech-dot" />
              {technology}
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}