import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, LogIn, UserPlus } from "lucide-react";
import ExcwaLogo from "../../components/common/ExcwaLogo";

export default function DevJoin() {
  return (
    <div className="dev-auth-page">

      <div className="ambient">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="grid-lines" />
      </div>

      <div className="dev-auth-wrap">

        <Link to="/" className="dev-back-link">
          <ArrowLeft size={14} />
          Back to EXCWA
        </Link>

        <div className="dev-auth-brand">
          <ExcwaLogo size={42} />
          <span>
            EXCWA <b>Developers</b>
          </span>
        </div>

        <h1 className="dev-auth-title">
          Join EXCWA
        </h1>

        <p className="dev-auth-sub">
          Join our developer network and work on exciting
          real-world technology projects.
        </p>

        <div className="dev-auth-card">

          {/* EXISTING USER */}
          <div className="join-option">

            <div className="join-option-icon">
              <LogIn size={20} />
            </div>

            <div className="join-option-content">

              <h2>Already have an account?</h2>

              <p>
                Sign in to access your developer dashboard,
                opportunities and assignments.
              </p>

              <Link
                to="/developer/login"
                className="primary-btn"
              >
                Sign In
                <ArrowRight size={15} />
              </Link>

            </div>
          </div>

          <div className="join-divider">
            <span>OR</span>
          </div>

          {/* NEW USER */}
          <div className="join-option">

            <div className="join-option-icon">
              <UserPlus size={20} />
            </div>

            <div className="join-option-content">

              <h2>New to EXCWA?</h2>

              <p>
                Create your account and complete your
                developer profile for review.
              </p>

              <Link
                to="/developer/register"
                className="secondary-btn"
              >
                Create Account
                <ArrowRight size={15} />
              </Link>

            </div>
          </div>

        </div>

        <p className="dev-auth-footer-text">
          EXCWA reviews developer profiles before granting
          access to project opportunities.
        </p>

      </div>
    </div>
  );
}