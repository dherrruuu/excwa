import { useState } from "react";
import {
  Upload,
  Globe,
  ArrowRight,
  CheckCircle,
  X,
} from "lucide-react";

import {
  createDeveloperApplication,
} from "../../services/client/developerApplicationService";

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Java Developer",
  "Python Developer",
  "Mobile App Developer",
  "UI/UX Designer",
  "WordPress Developer",
  "DevOps Engineer",
  "QA / Tester",
  "Cyber Security",
  "Other",
];

export default function DeveloperApplicationForm({ onClose }) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    city: "",
    education: "",
    github_url: "",
    linkedin_url: "",
    portfolio_url: "",
    primary_roles: [],
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [resume, setResume] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /* =========================================================
     FORM CHANGE
     ========================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /* =========================================================
     ROLE SELECTION
     ========================================================= */

  const handleRoleChange = (role) => {
    setForm((prev) => {
      const exists = prev.primary_roles.includes(role);

      return {
        ...prev,
        primary_roles: exists
          ? prev.primary_roles.filter((item) => item !== role)
          : [...prev.primary_roles, role],
      };
    });

    setError("");
  };

  /* =========================================================
     PROFILE PHOTO
     ========================================================= */

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfilePhoto(null);
      setError("Please upload a valid profile photo.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfilePhoto(null);
      setError("Profile photo must be less than 5MB.");
      return;
    }

    setProfilePhoto(file);
    setError("");
  };

  /* =========================================================
     RESUME
     ========================================================= */

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const allowedExtensions = [".pdf", ".doc", ".docx"];

    const fileName = file.name.toLowerCase();

    const validType =
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((extension) =>
        fileName.endsWith(extension)
      );

    if (!validType) {
      setResume(null);
      setError("Resume must be PDF, DOC, or DOCX.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setResume(null);
      setError("Resume must be less than 10MB.");
      return;
    }

    setResume(file);
    setError("");
  };

  /* =========================================================
     VALIDATION
     ========================================================= */

  const validate = () => {
    if (!form.full_name.trim()) {
      return "Please enter your full name.";
    }

    if (!form.phone.trim()) {
      return "Please enter your phone number.";
    }

    if (!form.email.trim()) {
      return "Please enter your email address.";
    }

    if (!form.city.trim()) {
      return "Please enter your city.";
    }

    if (!form.education.trim()) {
      return "Please enter your education.";
    }

    if (form.primary_roles.length === 0) {
      return "Please select at least one developer role.";
    }

    if (!profilePhoto) {
      return "Please upload your profile photo.";
    }

    if (!resume) {
      return "Please upload your resume.";
    }

    return "";
  };

  /* =========================================================
     SUBMIT APPLICATION
     ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      /*
       * The service is responsible for:
       *
       * 1. Uploading profile photo
       * 2. Uploading resume
       * 3. Creating developer_applications row
       *
       * It does NOT create an Auth account.
       * It does NOT create developer_profiles.
       */

      await createDeveloperApplication({
        ...form,

        email: form.email.trim().toLowerCase(),

        profilePhoto,
        resume,
      });

      setSuccess(true);
    } catch (err) {
      console.error(
        "Developer application submission error:",
        err
      );

      setError(
        err?.message ||
          "Unable to submit your application. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SUCCESS SCREEN
     ========================================================= */

  if (success) {
    return (
      <div className="developer-application-overlay">
        <div className="developer-application-card success-card">

          <button
            type="button"
            className="developer-form-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          <div className="success-icon">
            <CheckCircle size={50} />
          </div>

          <h2>
            Application Submitted
          </h2>

          <p>
            Thank you for applying to join EXCWA Tech.
          </p>

          <p>
            Your application has been submitted
            successfully and is now under review
            by our team.
          </p>

          <p>
            If your application is approved, your
            developer account and profile will be
            created automatically.
          </p>

          <p>
            You will then be able to sign in and
            access the developer dashboard.
          </p>

          <button
            type="button"
            className="primary-btn"
            onClick={onClose}
          >
            Done
            <ArrowRight size={18} />
          </button>

        </div>
      </div>
    );
  }

  /* =========================================================
     APPLICATION FORM
     ========================================================= */

  return (
    <div className="developer-application-overlay">

      <div className="developer-application-card">

        {/* CLOSE */}

        <button
          type="button"
          className="developer-form-close"
          onClick={onClose}
          disabled={loading}
        >
          <X size={20} />
        </button>

        {/* HEADER */}

        <div className="developer-form-header">

          <span className="developer-form-eyebrow">
            JOIN EXCWA
          </span>

          <h2>
            Become an EXCWA
            <span> Developer</span>
          </h2>

          <p>
            Tell us about yourself, your skills,
            experience and the kind of work you
            are looking for.
          </p>

          <p className="developer-form-help">
            Your information will be reviewed by
            the EXCWA team before developer access
            is granted.
          </p>

        </div>

        <form onSubmit={handleSubmit}>

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <div className="developer-form-section">

            <h3>
              Basic Information
            </h3>

            <div className="developer-form-grid">

              <div className="developer-form-field">

                <label>
                  Full Name *
                </label>

                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  autoComplete="name"
                  disabled={loading}
                />

              </div>

              <div className="developer-form-field">

                <label>
                  Phone Number *
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXX XXXXX"
                  autoComplete="tel"
                  disabled={loading}
                />

              </div>

              <div className="developer-form-field">

                <label>
                  Email Address *
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                />

              </div>

              <div className="developer-form-field">

                <label>
                  City *
                </label>

                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Your city"
                  autoComplete="address-level2"
                  disabled={loading}
                />

              </div>

              <div className="developer-form-field full-width">

                <label>
                  Education *
                </label>

                <input
                  type="text"
                  name="education"
                  value={form.education}
                  onChange={handleChange}
                  placeholder="B.Tech / BCA / MCA / Diploma / Self-taught / etc."
                  disabled={loading}
                />

              </div>

            </div>

          </div>

          {/* =================================================
              PROFILE PHOTO
          ================================================= */}

          <div className="developer-form-section">

            <h3>
              Profile Photo
            </h3>

            <label className="developer-upload-box">

              <Upload size={24} />

              <span>
                {profilePhoto
                  ? profilePhoto.name
                  : "Upload your profile photo"}
              </span>

              <small>
                PNG, JPG or WEBP · Max 5MB
              </small>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoChange}
                disabled={loading}
                hidden
              />

            </label>

          </div>

          {/* =================================================
              PROFESSIONAL PROFILES
          ================================================= */}

          <div className="developer-form-section">

            <h3>
              Professional Profiles
            </h3>

            <div className="developer-form-grid">

              <div className="developer-form-field">

                <label>
                  <span style={{ fontWeight: 700 }}>
                    GH
                  </span>
                  GitHub
                </label>

                <input
                  type="url"
                  name="github_url"
                  value={form.github_url}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                  disabled={loading}
                />

              </div>

              <div className="developer-form-field">

                <label>
                  <span style={{ fontWeight: 700 }}>
                    in
                  </span>
                  LinkedIn
                </label>

                <input
                  type="url"
                  name="linkedin_url"
                  value={form.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                  disabled={loading}
                />

              </div>

              <div className="developer-form-field full-width">

                <label>
                  <Globe size={15} />
                  Portfolio
                </label>

                <input
                  type="url"
                  name="portfolio_url"
                  value={form.portfolio_url}
                  onChange={handleChange}
                  placeholder="https://yourportfolio.com"
                  disabled={loading}
                />

              </div>

            </div>

          </div>

          {/* =================================================
              ROLES
          ================================================= */}

          <div className="developer-form-section">

            <h3>
              Developer Roles *
            </h3>

            <p className="developer-form-help">
              Select all roles that match your
              skills and experience.
            </p>

            <div className="developer-role-grid">

              {ROLES.map((role) => {

                const selected =
                  form.primary_roles.includes(role);

                return (
                  <button
                    type="button"
                    key={role}
                    className={`developer-role ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() =>
                      handleRoleChange(role)
                    }
                    disabled={loading}
                  >
                    {role}
                  </button>
                );

              })}

            </div>

          </div>

          {/* =================================================
              RESUME
          ================================================= */}

          <div className="developer-form-section">

            <h3>
              Resume *
            </h3>

            <label className="developer-upload-box">

              <Upload size={24} />

              <span>
                {resume
                  ? resume.name
                  : "Upload your resume"}
              </span>

              <small>
                PDF, DOC or DOCX · Max 10MB
              </small>

              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeChange}
                disabled={loading}
                hidden
              />

            </label>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="developer-form-error">
              {error}
            </div>
          )}

          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="submit"
            className="primary-btn developer-submit-btn"
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="admin-spinner" />
                Submitting Application...
              </>
            ) : (
              <>
                Submit Application
                <ArrowRight size={18} />
              </>
            )}

          </button>

          <p className="developer-form-note">
            By submitting this application, you
            confirm that the information provided
            is accurate and may be reviewed by
            EXCWA Tech for developer opportunities.
          </p>

        </form>

      </div>

    </div>
  );
}
