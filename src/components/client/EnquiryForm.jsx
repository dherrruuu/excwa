import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { createEnquiry } from "../../services/client/enquiryService";

const serviceOptions = [
  "Website",
  "Web Application",
  "Android Application",
  "iOS Application",
  "Hybrid / Cross-Platform Application",
  "Custom Software",
  "UI/UX Design",
  "Security Testing",
  "Maintenance / Support",
  "Multiple / All Services",
  "Other",
];

const budgetOptions = [
  "Under ₹25,000",
  "₹25,000 – ₹50,000",
  "₹50,000 – ₹1,00,000",
  "₹1,00,000+",
  "Not Sure Yet",
];

const contactOptions = [
  "Phone",
  "Email",
  "WhatsApp",
];

export default function EnquiryForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    description: "",
    budget: "",
    contact: "",
  });

  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const update = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: "",
    }));
  };

  const validate = () => {
    const validationErrors = {};

    if (!form.name.trim()) {
      validationErrors.name = "Please enter your name.";
    }

    if (!/^[+]?[\d\s()-]{8,18}$/.test(form.phone.trim())) {
      validationErrors.phone = "Enter a valid phone number.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      validationErrors.email = "Enter a valid email address.";
    }

    if (!form.service) {
      validationErrors.service = "Please select a service.";
    }

    if (form.description.trim().length < 20) {
      validationErrors.description =
        "Please provide at least 20 characters.";
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await createEnquiry(form);

      setSent(true);

      setForm({
        name: "",
        phone: "",
        email: "",
        service: "",
        description: "",
        budget: "",
        contact: "",
      });

    } catch (error) {
      console.error("Enquiry submission failed:", error);

      setSubmitError(
        "We couldn't submit your enquiry right now. Please try again."
      );

    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="success-card">

        <div className="success-icon">
          <CheckCircle2 size={34} />
        </div>

        <h3>Enquiry Received.</h3>

        <p>
          Thank you! Your project enquiry has been received.
          Our team will contact you shortly.
        </p>

        <button
          className="secondary-btn"
          onClick={() => setSent(false)}
        >
          Send Another Enquiry
        </button>

      </div>
    );
  }

  return (
    <form
      className="enquiry-form"
      onSubmit={submit}
      noValidate
    >

      <div className="form-grid">

        <Field
          label="Customer Name"
          value={form.name}
          onChange={(value) => update("name", value)}
          error={errors.name}
          placeholder="Your name"
        />

        <Field
          label="Phone Number"
          value={form.phone}
          onChange={(value) => update("phone", value)}
          error={errors.phone}
          placeholder="+91 00000 00000"
          type="tel"
        />

        <Field
          label="Email Address"
          value={form.email}
          onChange={(value) => update("email", value)}
          error={errors.email}
          placeholder="you@example.com"
          type="email"
        />

        <SelectField
          label="Type of Service Required"
          value={form.service}
          onChange={(value) => update("service", value)}
          error={errors.service}
          options={serviceOptions}
        />

        <SelectField
          label="Estimated Budget"
          value={form.budget}
          onChange={(value) => update("budget", value)}
          options={budgetOptions}
          optional
        />

        <SelectField
          label="Preferred Contact Method"
          value={form.contact}
          onChange={(value) => update("contact", value)}
          options={contactOptions}
          optional
        />

        <div className="field full">

          <label>Project Description</label>

          <textarea
            value={form.description}
            onChange={(event) =>
              update("description", event.target.value)
            }
            placeholder="Tell us about your idea, requirements, features or current system..."
            rows="5"
          />

          {errors.description && (
            <small className="error">
              {errors.description}
            </small>
          )}

        </div>

      </div>

      <button
        className="primary-btn form-submit"
        type="submit"
        disabled={submitting}
      >
        {submitting
          ? "Sending Enquiry..."
          : "Send Project Enquiry"}

        {!submitting && <ArrowRight size={18} />}
      </button>

      {submitError && (
        <small className="error submit-error">
          {submitError}
        </small>
      )}

      <small className="privacy-note">
        <ShieldCheck size={14} />
        Your information is only used to respond to your enquiry.
      </small>

    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
}) {
  return (
    <div className="field">

      <label>{label}</label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
      />

      {error && (
        <small className="error">
          {error}
        </small>
      )}

    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  error,
  options,
  optional = false,
}) {
  return (
    <div className="field">

      <label>
        {label}

        {optional && (
          <em>Optional</em>
        )}
      </label>

      <div className="select-wrap">

        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        >
          <option value="">
            Select an option
          </option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown size={16} />

      </div>

      {error && (
        <small className="error">
          {error}
        </small>
      )}

    </div>
  );
}