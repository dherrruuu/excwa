import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDeveloper } from "../../hooks/useDeveloper";

function isProfileComplete(profile) {
  if (!profile) return false;
  const required = [
    "full_name",
    "phone",
    "city",
    "profile_photo_url",
    "github_url",
    "linkedin_url",
    "resume_url",
  ];

  return required.every((key) => {
    const value = profile[key];
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

export default function DevProtectedRoute() {
  const { user, devProfile, loading } = useDeveloper();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/developer/login", { replace: true });
      return;
    }

    if (!devProfile || !isProfileComplete(devProfile)) {
      navigate("/developer/profile", { replace: true });
      return;
    }

    const status = devProfile.status;
    if (status === "pending") {
      navigate("/developer/pending", { replace: true });
      return;
    }
    if (status === "rejected") {
      navigate("/developer/rejected", { replace: true });
      return;
    }
    if (status === "suspended") {
      navigate("/developer/suspended", { replace: true });
      return;
    }
    if (status !== "approved") {
      navigate("/developer/profile", { replace: true });
    }
  }, [user, devProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
        Loading...
      </div>
    );
  }

  if (!user || !devProfile || devProfile.status !== "approved") return null;

  return <Outlet />;
}