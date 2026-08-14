import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function About() {
  const features = [
    "Modern technology",
    "Clean development",
    "Scalable architecture",
    "Security & performance",
    "Responsive design",
    "Long-term support",
  ];

  return (
    <section id="about" className="section about-section">
      <div className="container about-grid">

        <div className="about-visual">
          <div className="about-panel">
            <div className="panel-label">EXCWA / CORE</div>

            <div className="big-code">
              <span>01</span> Build with purpose.
            </div>

            <div className="code-lines">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>

            <div className="status-row">
              <span className="status">
                <b /> SYSTEM ONLINE
              </span>

              <span>99.9% READY</span>
            </div>
          </div>

          <div className="mini-card mini-a">
            <Zap size={16} />
            Performance
          </div>

          <div className="mini-card mini-b">
            <ShieldCheck size={16} />
            Security
          </div>
        </div>

        <div className="about-copy">
          <div className="section-heading">

            <span className="eyebrow">
              About EXCWA Tech
            </span>

            <h2>
              Technology With Purpose.
            </h2>

            <p>
              We focus on building practical, modern and reliable
              digital solutions—not simply delivering code.
            </p>

          </div>

          <div className="check-list">
            {features.map((feature) => (
              <div key={feature}>
                <CheckCircle2 size={18} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="container stats">

        <div className="stat">
          <strong>50+</strong>
          <span>Projects</span>
        </div>

        <div className="stat">
          <strong>10+</strong>
          <span>Technologies</span>
        </div>

        <div className="stat">
          <strong>24/7</strong>
          <span>Support</span>
        </div>

        <div className="stat">
          <strong>100%</strong>
          <span>Client Focus</span>
        </div>

      </div>
    </section>
  );
}