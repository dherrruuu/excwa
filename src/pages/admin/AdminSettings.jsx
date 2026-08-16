import React from "react";
import "../../styles/admin/admin-settings.css";
import { Settings, ShieldCheck, Database, Bell } from "lucide-react";

export default function AdminSettings() {
  return (
    <div className="admin-page">

      <div className="admin-page-header">
        <div>
          <span className="admin-eyebrow">
            ADMINISTRATION
          </span>

          <h1>Settings</h1>

          <p>
            Manage your EXCWA Tech admin panel configuration.
          </p>
        </div>
      </div>

      <div className="admin-settings-grid">

        <div className="admin-setting-card">
          <div className="admin-setting-icon">
            <Settings size={21} />
          </div>

          <div>
            <h3>General Settings</h3>
            <p>
              Configure general administration preferences.
            </p>
          </div>

          <span className="admin-setting-status">
            Available
          </span>
        </div>


        <div className="admin-setting-card">
          <div className="admin-setting-icon">
            <ShieldCheck size={21} />
          </div>

          <div>
            <h3>Security</h3>
            <p>
              Manage authentication and security-related settings.
            </p>
          </div>

          <span className="admin-setting-status">
            Protected
          </span>
        </div>


        <div className="admin-setting-card">
          <div className="admin-setting-icon">
            <Database size={21} />
          </div>

          <div>
            <h3>Database</h3>
            <p>
              Enquiries are stored securely using Supabase.
            </p>
          </div>

          <span className="admin-setting-status">
            Connected
          </span>
        </div>


        <div className="admin-setting-card">
          <div className="admin-setting-icon">
            <Bell size={21} />
          </div>

          <div>
            <h3>Notifications</h3>
            <p>
              Notification and enquiry alerts can be configured here.
            </p>
          </div>

          <span className="admin-setting-status">
            Ready
          </span>
        </div>

      </div>

    </div>
  );
}