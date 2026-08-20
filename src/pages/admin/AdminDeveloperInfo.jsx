import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import {
  getDeveloperInfoList,
} from "../../services/admin/developerInfoService";

import DeveloperInfoTable from "../../components/admin/DeveloperInfoTable";
import DeveloperInfoDetails from "../../components/admin/DeveloperInfoDetails";

import "../../styles/admin/admin-developer-info.css";

export default function AdminDeveloperInfo() {
  const [developers, setDevelopers] = useState([]);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD DEVELOPERS
  ========================================================= */

  const loadDevelopers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      console.log(
        "[AdminDeveloperInfo] Loading developers..."
      );

      const data = await getDeveloperInfoList();

      console.log(
        "[AdminDeveloperInfo] Developers received:",
        data
      );

      if (!Array.isArray(data)) {
        setDevelopers([]);
        return;
      }

      setDevelopers(data);
    } catch (err) {
      console.error(
        "[AdminDeveloperInfo] Failed to load developers:",
        err
      );

      setError(
        err?.message ||
          "Unable to load developers."
      );

      setDevelopers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevelopers();
  }, [loadDevelopers]);

  /* =========================================================
     OPEN DEVELOPER
  ========================================================= */

  function handleViewDeveloper(developer) {
    console.log(
      "[AdminDeveloperInfo] Opening developer:",
      developer
    );

    const id = developer?.id;

    if (!id) {
      console.error(
        "[AdminDeveloperInfo] Missing developer ID:",
        developer
      );

      setError(
        "Unable to open developer. Developer ID is missing."
      );

      return;
    }

    setError("");
    setSelectedDeveloperId(id);
  }

  /* =========================================================
     BACK TO LIST
  ========================================================= */

  function handleBack() {
    setSelectedDeveloperId(null);
    setError("");
  }

  /* =========================================================
     DEVELOPER UPDATED
  ========================================================= */

  function handleUpdated(updatedDeveloper) {
    if (!updatedDeveloper?.id) {
      return;
    }

    setDevelopers((current) =>
      current.map((developer) =>
        developer.id === updatedDeveloper.id
          ? {
              ...developer,
              ...updatedDeveloper,
            }
          : developer
      )
    );
  }

  /* =========================================================
     DETAILS VIEW
  ========================================================= */

  if (selectedDeveloperId) {
    return (
      <DeveloperInfoDetails
        developerId={selectedDeveloperId}
        onBack={handleBack}
        onUpdated={handleUpdated}
      />
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="developer-info-details">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <header className="developer-details-header">

        <div>
          <span className="developer-details-section-label">
            ADMINISTRATION
          </span>

          <h1>Developers</h1>

          <p>
            Manage registered developers and review
            their profiles.
          </p>
        </div>

      </header>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="developer-details-inline-error">
          <ShieldAlert size={17} />

          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div className="developer-details-loading">

          <Loader2
            size={25}
            className="spin"
          />

          <span>
            Loading developers...
          </span>

        </div>
      ) : (
        <DeveloperInfoTable
          developers={developers}
          onViewDeveloper={handleViewDeveloper}
        />
      )}

    </div>
  );
}