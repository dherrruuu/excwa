import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminLayout() {
  return (
    <div className="admin-app">

      <AdminSidebar />

      <div className="admin-main">

        <AdminTopbar />

        <main className="admin-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}