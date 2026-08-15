import {
  Eye,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function DeveloperApplicationRow({
  application,
  onView,
}) {
  const {
    full_name,
    email,
    phone,
    city,
    primary_roles,
    profile_photo_path,
    status,
    created_at,
  } = application;

  // =========================================================
  // PROFILE PHOTO URL
  // =========================================================

  const getPhotoUrl = () => {
    if (!profile_photo_path) {
      return null;
    }

    const {
      data,
    } = window.__supabaseStoragePhotoUrl
      ? {
          data: {
            publicUrl:
              window.__supabaseStoragePhotoUrl(
                profile_photo_path
              ),
          },
        }
      : {
          data: {
            publicUrl: null,
          },
        };

    return data?.publicUrl || null;
  };

  const {
        data: photoData,
        } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(profile_photo_path);

const photoUrl =
  photoData?.publicUrl || null;

  // =========================================================
  // DATE
  // =========================================================

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      )
    : "—";

  // =========================================================
  // STATUS
  // =========================================================

  const statusLabel =
    status?.charAt(0).toUpperCase() +
      status?.slice(1) || "Pending";

  return (
    <tr className="developer-application-row">

      {/* ===================================================
          APPLICANT
      =================================================== */}

      <td>

        <div className="developer-applicant-cell">

          {photoUrl ? (
            <img
              src={photoUrl}
              alt={full_name}
              className="developer-applicant-avatar"
            />
          ) : (
            <div className="developer-applicant-avatar developer-avatar-placeholder">
              {full_name
                ?.charAt(0)
                ?.toUpperCase() || "?"}
            </div>
          )}

          <div className="developer-applicant-info">

            <strong>
              {full_name || "Unnamed Applicant"}
            </strong>

            <span>
              {application.education ||
                "Education not provided"}
            </span>

          </div>

        </div>

      </td>

      {/* ===================================================
          CONTACT
      =================================================== */}

      <td>

        <div className="developer-contact-cell">

          <div>
            <Mail size={13} />
            <span>
              {email || "—"}
            </span>
          </div>

          <div>
            <Phone size={13} />
            <span>
              {phone || "—"}
            </span>
          </div>

        </div>

      </td>

      {/* ===================================================
          CITY
      =================================================== */}

      <td>

        <div className="developer-city-cell">

          <MapPin size={14} />

          <span>
            {city || "—"}
          </span>

        </div>

      </td>

      {/* ===================================================
          ROLES
      =================================================== */}

      <td>

        <div className="developer-row-roles">

          {Array.isArray(primary_roles) &&
          primary_roles.length > 0 ? (
            <>
              {primary_roles
                .slice(0, 2)
                .map((role) => (
                  <span
                    key={role}
                    className="developer-role-tag"
                  >
                    {role}
                  </span>
                ))}

              {primary_roles.length > 2 && (
                <span className="developer-role-more">
                  +{primary_roles.length - 2}
                </span>
              )}
            </>
          ) : (
            <span className="developer-no-data">
              —
            </span>
          )}

        </div>

      </td>

      {/* ===================================================
          DATE
      =================================================== */}

      <td>

        <span className="developer-application-date">
          {formattedDate}
        </span>

      </td>

      {/* ===================================================
          STATUS
      =================================================== */}

      <td>

        <span
          className={`developer-status-badge ${status}`}
        >
          <span className="developer-status-dot" />
          {statusLabel}
        </span>

      </td>

      {/* ===================================================
          ACTION
      =================================================== */}

      <td>

        <button
          type="button"
          className="developer-view-btn"
          onClick={onView}
        >
          <Eye size={15} />
          View
        </button>

      </td>

    </tr>
  );
}