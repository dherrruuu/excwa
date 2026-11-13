import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";

const advantages = [
  ["Custom-Built Solutions", "Solutions designed around your actual business requirements."],
  ["Modern Technology", "Modern development practices and technologies for maintainable products."],
  ["Performance Focused", "Fast loading, efficient architecture and smooth experiences."],
  ["Security Conscious", "Security considerations throughout development and testing."],
  ["Responsive & Scalable", "Solutions that work across devices and evolve with your needs."],
  ["Transparent Communication", "Clear communication through planning, development and launch."],
];

export default function WhyExcwa() {
  return (
    <section id="why" className="section">
      <div className="container">

        <div className="section-heading">
          <span className="eyebrow">
            <Sparkles size={13} />
            The EXCWA Difference
          </span>

          <h2>Why Build With EXCWA?</h2>

          <p>
            A focused development approach designed to turn ideas into
            dependable digital products.
          </p>
        </div>

        <div className="advantage-grid">
          {advantages.map(([title, description], index) => (
            <motion.article
              key={title}
              className="advantage-card"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.55,
                delay: index * 0.05,
              }}
            >
              <span>
                {String(index + 1).padStart(2, "0")}
              </span>

              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>

              <ArrowUpRight
                className="adv-arrow"
                size={20}
              />
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
}