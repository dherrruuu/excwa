import {
  Eye,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";

export default function DeveloperInfoTable({
  developers = [],
  onViewDeveloper,
}) {
  function formatStatus(status) {
    if (!status) {
      return "Unknown";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getInitials(name) {
    if (!name) {
      return "D";
    }

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("");
  }

  return (
    <section className="developer-details-card">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="developer-details-card-header">

        <div>
          <span className="developer-details-section-label">
            DEVELOPER DIRECTORY
          </span>

          <h2>
            Registered Developers
          </h2>
        </div>

        <div className="developer-details-card-icon">
          <UserRound size={19} />
        </div>

      </div>

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {developers.length === 0 ? (
        <div className="developer-details-empty">
          No developers found.
        </div>
      ) : (
        <div className="developer-info-table-wrapper">

          <table className="developer-info-table">

            <thead>
              <tr>
                <th>Developer</th>
                <th>Phone</th>
                <th>City</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {developers.map((developer) => (

                <tr key={developer.id}>

                  {/* =========================================
                      DEVELOPER
                  ========================================= */}

                  <td>
                    <div className="developer-info-developer-cell">

                      <div className="developer-info-avatar">

                        {developer.profile_photo_url ? (
                          <img
                            src={
                              developer.profile_photo_url
                            }
                            alt={
                              developer.full_name ||
                              "Developer"
                            }
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              const fallback =
                                event.currentTarget
                                  .nextElementSibling;

                              if (fallback) {
                                fallback.style.display =
                                  "flex";
                              }
                            }}
                          />
                        ) : null}

                        <span
                          style={{
                            display:
                              developer.profile_photo_url
                                ? "none"
                                : "flex",
                          }}
                        >
                          {getInitials(
                            developer.full_name
                          )}
                        </span>

                      </div>

                      <div>
                        <strong>
                          {developer.full_name ||
                            "Unnamed Developer"}
                        </strong>

                        <small>
                          {developer.id}
                        </small>
                      </div>

                    </div>
                  </td>

                  {/* =========================================
                      PHONE
                  ========================================= */}

                  <td>
                    <div className="developer-info-simple-cell">
                      <Phone size={14} />

                      <span>
                        {developer.phone || "—"}
                      </span>
                    </div>
                  </td>

                  {/* =========================================
                      CITY
                  ========================================= */}

                  <td>
                    <div className="developer-info-simple-cell">
                      <MapPin size={14} />

                      <span>
                        {developer.city || "—"}
                      </span>
                    </div>
                  </td>

                  {/* =========================================
                      STATUS
                  ========================================= */}

                  <td>
                    <span
                      className={`developer-info-status status-${developer.status}`}
                    >
                      {formatStatus(
                        developer.status
                      )}
                    </span>
                  </td>

                  {/* =========================================
                      JOINED
                  ========================================= */}

                  <td>
                    {formatDate(
                      developer.created_at
                    )}
                  </td>

                  {/* =========================================
                      ACTION
                  ========================================= */}

                  <td>

                    <button
                      type="button"
                      className="developer-info-view-button"
                      title="View developer"
                      onClick={() =>
                        onViewDeveloper?.(
                          developer
                        )
                      }
                    >
                      <Eye size={16} />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </section>
  );
}