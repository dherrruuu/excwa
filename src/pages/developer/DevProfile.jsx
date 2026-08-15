import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Image as ImageIcon, UploadCloud } from "lucide-react";
import ExcwaLogo from "../../components/common/ExcwaLogo";
import { useDeveloper } from "../../hooks/useDeveloper";
import { getAllSkills } from "../../services/developerService";
import { supabase } from "../../lib/supabase";

const PRIMARY_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Android Developer",
  "iOS Developer",
  "UI/UX Designer",
  "Security Researcher",
  "DevOps Engineer",
];

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

function isValidUrl(value) {
  if (!value || !value.trim()) return true;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function getUploadUrl(bucket, file, folder) {
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  return { path, bucket };
}

async function uploadToBucket(bucketName, file, folderName) {
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const filePath = `${folderName}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
  return publicData.publicUrl;
}

function normalizeProfile(payload) {
  return {
    full_name: payload.full_name || "",
    phone: payload.phone || "",
    city: payload.city || "",
    profile_photo_url: payload.profile_photo_url || "",
    github_url: payload.github_url || "",
    linkedin_url: payload.linkedin_url || "",
    portfolio_url: payload.portfolio_url || "",
    resume_url: payload.resume_url || "",
    primary_roles: Array.isArray(payload.primary_roles) ? payload.primary_roles : [],
  };
}

export default function DevProfile() {
  const navigate = useNavigate();
  const { user, devProfile, loading } = useDeveloper();

  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    profile_photo_url: "",
    github_url: "",
    linkedin_url: "",
    portfolio_url: "",
    primary_roles: [],
    resume_url: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/developer/login");
      return;
    }

    if (!loading && user && devProfile?.status === "approved") {
      navigate("/developer/dashboard");
      return;
    }

    if (!loading && user && devProfile?.status === "pending") {
      navigate("/developer/pending");
      return;
    }

    if (!loading && user && devProfile?.status === "rejected") {
      navigate("/developer/rejected");
      return;
    }

    if (!loading && user && devProfile?.status === "suspended") {
      navigate("/developer/suspended");
      return;
    }
  }, [loading, user, devProfile, navigate]);

  useEffect(() => {
    getAllSkills().then(setSkills).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user || !devProfile) return;

    const nextForm = normalizeProfile(devProfile);
    setForm(nextForm);
    setSelectedSkillIds([]);

    supabase
      .from("developer_skills")
      .select("skill_id")
      .eq("developer_id", devProfile.id)
      .then(({ data }) => {
        setSelectedSkillIds((data || []).map((row) => row.skill_id));
      })
      .catch(console.error);
  }, [user, devProfile]);

  function toggleRole(role) {
    setForm((prev) => ({
      ...prev,
      primary_roles: prev.primary_roles.includes(role)
        ? prev.primary_roles.filter((item) => item !== role)
        : [...prev.primary_roles, role],
    }));
  }

  function toggleSkill(skillId) {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  }

  function validateStepOne() {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.profile_photo_url) return "Profile photo is required.";
    return "";
  }

  function validateStepTwo() {
    if (!form.primary_roles.length) return "Select at least one primary role.";
    if (!selectedSkillIds.length) return "Select at least one skill.";
    return "";
  }

  function validateStepThree() {
    if (!form.github_url.trim()) return "GitHub URL is required.";
    if (!isValidUrl(form.github_url)) return "GitHub must be a valid URL.";
    if (!form.linkedin_url.trim()) return "LinkedIn URL is required.";
    if (!isValidUrl(form.linkedin_url)) return "LinkedIn must be a valid URL.";
    if (form.portfolio_url && !isValidUrl(form.portfolio_url)) return "Portfolio URL must be valid when provided.";
    if (!form.resume_url) return "Resume PDF upload is required.";
    return "";
  }

  function getStepButtonLabel() {
    if (step === 1) return "Continue to Roles & Skills";
    if (step === 2) return "Continue to Profile Links";
    return "Review Profile";
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Profile photo must be an image file.");
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setError("Profile photo must be under 5MB.");
      return;
    }

    setError("");
    setPhotoUploading(true);

    try {
      const url = await uploadToBucket("profile-photos", file, `developers/${user.id}`);
      setForm((prev) => ({ ...prev, profile_photo_url: url }));
    } catch (exc) {
      setError(exc.message || "Could not upload profile photo.");
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  }

  async function handleResumeUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Resume must be a PDF file.");
      return;
    }

    if (file.size > MAX_RESUME_SIZE) {
      setError("Resume must be under 5MB.");
      return;
    }

    setError("");
    setResumeUploading(true);

    try {
      const url = await uploadToBucket("developer-resumes", file, `developers/${user.id}`);
      setForm((prev) => ({ ...prev, resume_url: url }));
    } catch (exc) {
      setError(exc.message || "Could not upload resume.");
    } finally {
      setResumeUploading(false);
      event.target.value = "";
    }
  }

  async function saveProfile({ markPending = false } = {}) {
    if (!user) {
      navigate("/developer/login");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const profilePayload = {
        id: user.id,
        full_name: form.full_name.trim(),
        email: user.email,
        phone: form.phone.trim(),
        role: "developer",
      };

      const { error: profilesError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profilesError) throw profilesError;

      const existing = await supabase
        .from("developer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const profileData = {
        user_id: user.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        profile_photo_url: form.profile_photo_url,
        github_url: form.github_url.trim(),
        linkedin_url: form.linkedin_url.trim(),
        portfolio_url: form.portfolio_url.trim() || null,
        resume_url: form.resume_url,
        primary_roles: form.primary_roles,
        status: markPending ? "pending" : existing.data?.status || "pending",
      };

      const { data: devData, error: devError } = existing.data
        ? await supabase.from("developer_profiles").update(profileData).eq("id", existing.data.id).select().single()
        : await supabase.from("developer_profiles").insert(profileData).select().single();

      if (devError) throw devError;

      const developerId = devData.id;
      await supabase.from("developer_skills").delete().eq("developer_id", developerId);

      if (selectedSkillIds.length) {
        const rows = selectedSkillIds.map((skillId) => ({ developer_id: developerId, skill_id: skillId }));
        const { error: skillError } = await supabase.from("developer_skills").insert(rows);
        if (skillError) throw skillError;
      }

      if (markPending) {
        navigate("/developer/pending");
      } else {
        navigate("/developer/profile");
      }
    } catch (exc) {
      setError(exc.message || "Unable to save your developer profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    setError("");

    if (step === 1) {
      const message = validateStepOne();
      if (message) return setError(message);
      setStep(2);
      return;
    }

    if (step === 2) {
      const message = validateStepTwo();
      if (message) return setError(message);
      setStep(3);
      return;
    }

    const message = validateStepThree();
    if (message) return setError(message);
    saveProfile({ markPending: true });
  }

  function handleBack() {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  }

  const progressLabel = step === 1 ? "STEP 1 — BASIC DETAILS" : step === 2 ? "STEP 2 — ROLES & SKILLS" : "STEP 3 — PROFESSIONAL LINKS & DOCUMENTS";

  return (
    <div className="dev-auth-page">
      <div className="ambient">
        <div className="orb orb-a" /><div className="orb orb-b" /><div className="orb orb-c" />
        <div className="grid-lines" />
      </div>

      <div className="dev-auth-wrap" style={{ width: "min(760px, 100%)" }}>
        <Link to="/" className="dev-back-link">
          <ArrowLeft size={14} /> Back to EXCWA
        </Link>

        <div className="dev-auth-brand">
          <ExcwaLogo size={42} />
          <span>EXCWA <b>Developers</b></span>
        </div>

        <h1 className="dev-auth-title" style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>Complete your developer profile</h1>
        <p className="dev-auth-sub">Build your profile to start receiving project opportunities from EXCWA.</p>

        <div className="dev-steps" style={{ justifyContent: "center" }}>
          {[1, 2, 3].map((item) => (
            <div key={item} className={`dev-step ${step >= item ? "active" : ""}`} style={{ minWidth: 0 }}>
              <span className="dev-step-num">{step > item ? <CheckCircle size={12} /> : item}</span>
              {item === 1 ? "BASIC DETAILS" : item === 2 ? "ROLES & SKILLS" : "PROFESSIONAL LINKS"}
            </div>
          ))}
        </div>

        <div className="dev-auth-card" style={{ padding: "28px 26px" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{progressLabel}</div>

          {step === 1 && (
            <div className="form-grid">
              <div className="field">
                <label>Full Name <em>*</em></label>
                <input
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Phone Number <em>*</em></label>
                <input
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="field full">
                <label>City <em>*</em></label>
                <input
                  placeholder="Surat, Gujarat"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div className="field full">
                <label>Profile Photo <em>*</em></label>
                <div className="dev-upload-box">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                  <div className="dev-upload-content">
                    <ImageIcon size={18} />
                    <span>{form.profile_photo_url ? "Photo uploaded" : photoUploading ? "Uploading photo..." : "Upload your profile picture"}</span>
                  </div>
                </div>
                {form.profile_photo_url && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={form.profile_photo_url} alt="Profile" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,.1)" }} />
                    <span style={{ color: "#8995a6", fontSize: 11 }}>Profile photo ready</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <div className="field full">
                <label>Primary Role(s) <em>*</em></label>
                <div className="dev-skills-grid" style={{ marginTop: 8 }}>
                  {PRIMARY_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`dev-skill-chip ${form.primary_roles.includes(role) ? "selected" : ""}`}
                      onClick={() => toggleRole(role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field full">
                <label>Skills <em>*</em></label>
                {skills.length === 0 ? (
                  <p style={{ color: "#566273", fontSize: 12, marginTop: 8 }}>Loading skills...</p>
                ) : (
                  <div className="dev-skills-grid" style={{ marginTop: 8 }}>
                    {skills.map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        className={`dev-skill-chip ${selectedSkillIds.includes(skill.id) ? "selected" : ""}`}
                        onClick={() => toggleSkill(skill.id)}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <div className="field">
                <label>GitHub URL <em>*</em></label>
                <input
                  type="url"
                  placeholder="https://github.com/yourname"
                  value={form.github_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, github_url: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>LinkedIn URL <em>*</em></label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/yourname"
                  value={form.linkedin_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                />
              </div>

              <div className="field full">
                <label>Portfolio URL <em style={{ color: "#5e6a7b", fontStyle: "normal" }}>optional</em></label>
                <input
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={form.portfolio_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, portfolio_url: e.target.value }))}
                />
              </div>

              <div className="field full">
                <label>Resume PDF <em>*</em></label>
                <div className="dev-upload-box">
                  <input type="file" accept="application/pdf" onChange={handleResumeUpload} />
                  <div className="dev-upload-content">
                    <FileText size={18} />
                    <span>{form.resume_url ? "Resume uploaded" : resumeUploading ? "Uploading resume..." : "Upload PDF resume"}</span>
                  </div>
                </div>
                {form.resume_url && (
                  <div style={{ marginTop: 12, color: "#8995a6", fontSize: 11 }}>
                    <a href={form.resume_url} target="_blank" rel="noreferrer" className="dev-link">Open resume PDF</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="error" style={{ marginTop: 18 }}>{error}</p>}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            {step > 1 && (
              <button className="secondary-btn" onClick={handleBack} disabled={saving} style={{ flex: "0 0 auto" }}>
                Back
              </button>
            )}
            <button className="primary-btn" style={{ flex: 1 }} onClick={handleNext} disabled={saving || photoUploading || resumeUploading}>
              {saving ? "Saving..." : getStepButtonLabel()}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
            <span style={{ fontSize: 11, color: "#667387" }}>
              <UploadCloud size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Required fields: name, phone, city, photo, role, skill, GitHub, LinkedIn, resume
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
