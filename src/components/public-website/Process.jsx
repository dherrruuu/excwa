import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const process = [
  ["01", "Discuss", "Understand the idea, requirements and business goals."],
  ["02", "Plan", "Define features, architecture, technology and project scope."],
  ["03", "Design", "Create the interface and user experience."],
  ["04", "Develop", "Build the frontend, backend, database and integrations."],
  ["05", "Test", "Test functionality, responsiveness, performance and security."],
  ["06", "Launch", "Deploy the finished product and provide ongoing support."],
];

export default function Process() {
  return (
    <section className="section process-section">
      <div className="container">

        <div className="section-heading">
          <span className="eyebrow">
            <Sparkles size={13} />
            How We Work
          </span>

          <h2>From Idea to Launch.</h2>

          <p>
            A straightforward development process with clarity at every
            stage.
          </p>
        </div>

        <div className="process">
          {process.map(([number, title, description], index) => (
            <motion.div
              key={number}
              className="process-item"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.06,
              }}
            >
              <div className="process-num">
                {number}
              </div>

              <div className="process-line" />

              <div className="process-content">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}