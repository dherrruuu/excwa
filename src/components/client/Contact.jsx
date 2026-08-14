import React from "react";
import { Mail, Phone, MessageCircle, Sparkles } from "lucide-react";
import EnquiryForm from "./EnquiryForm";

export default function Contact() {
  return (
    <section id="contact" className="section contact-section">
      <div className="container">

        <div className="contact-wrap">

          {/* LEFT */}
          <div className="contact-intro">

            <span className="eyebrow">
              <Sparkles size={13} />
              Start a Conversation
            </span>

            <h2>
              Let's Build Something{" "}
              <span>Great Together.</span>
            </h2>

            <p>
              Have an idea, business requirement or project in mind?
              Tell us what you need and the EXCWA Tech team will get in
              touch with you.
            </p>

            <div className="contact-info">

              <div>
                <span>
                  <Mail size={13} />
                  Email
                </span>
                <b>[official email]</b>
              </div>

              <div>
                <span>
                  <Phone size={13} />
                  Phone
                </span>
                <b>[official phone]</b>
              </div>

              <div>
                <span>
                  <MessageCircle size={13} />
                  WhatsApp
                </span>
                <b>[official WhatsApp]</b>
              </div>

            </div>

          </div>

          {/* RIGHT */}
          <EnquiryForm />

        </div>

      </div>
    </section>
  );
}