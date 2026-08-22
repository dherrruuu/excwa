import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../../styles/client-portal.css";

export default function ClientLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data?.user) {
        throw new Error("Unable to authenticate account.");
      }

      /*
       * Verify that the authenticated user
       * is actually connected to a client account.
       */
      const { data: clientUser, error: clientUserError } =
        await supabase
          .from("client_users")
          .select(`
            id,
            client_id,
            user_id,
            role
          `)
          .eq("user_id", data.user.id)
          .maybeSingle();

      if (clientUserError) {
        throw clientUserError;
      }

      if (!clientUser) {
        await supabase.auth.signOut();

        setError(
          "This account is not registered as a client."
        );

        return;
      }

      /*
       * Verify that the client account still exists.
       */
      const { data: client, error: clientError } =
        await supabase
          .from("clients")
          .select(`
            id,
            company_name,
            contact_name,
            email,
            phone,
            status
          `)
          .eq("id", clientUser.client_id)
          .maybeSingle();

      if (clientError) {
        throw clientError;
      }

      if (!client) {
        await supabase.auth.signOut();

        setError(
          "Your client account could not be found."
        );

        return;
      }

      /*
       * Optional account status check.
       */
      if (
        client.status &&
        !["active", "approved"].includes(
          client.status
        )
      ) {
        await supabase.auth.signOut();

        setError(
          `Your client account is currently ${client.status}.`
        );

        return;
      }

      navigate("/client/dashboard", {
        replace: true,
      });

    } catch (err) {
      console.error("Client login error:", err);

      setError(
        err?.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-portal-page">

      <div className="client-login-card">

        <div className="client-login-header">

          <span className="client-eyebrow">
            EXCWA TECH
          </span>

          <h1>
            Client Portal
          </h1>

          <p>
            Sign in to manage your projects,
            enquiries and account.
          </p>

        </div>

        <form
          className="client-login-form"
          onSubmit={handleLogin}
        >

          {error && (
            <div className="client-login-error">
              {error}
            </div>
          )}

          <div className="client-field">

            <label htmlFor="client-email">
              Email
            </label>

            <div className="client-input-wrapper">

              <Mail size={16} />

              <input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
              />

            </div>

          </div>

          <div className="client-field">

            <label htmlFor="client-password">
              Password
            </label>

            <div className="client-input-wrapper">

              <Lock size={16} />

              <input
                id="client-password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />

            </div>

          </div>

          <button
            type="submit"
            className="client-login-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="client-spin"
                />

                Signing in...
              </>
            ) : (
              <>
                Sign in

                <ArrowRight size={16} />
              </>
            )}

          </button>

        </form>

      </div>

    </div>
  );
}