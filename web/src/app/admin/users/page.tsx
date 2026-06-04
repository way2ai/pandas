import Link from "next/link";

const users = [
  { email: "admin@example.com", role: "platform_admin", status: "active" },
  { email: "disabled@example.com", role: "personal_user", status: "disabled" },
];

export default function AdminUsersPage() {
  return (
    <main>
      <h1>Users</h1>
      <nav aria-label="User administration navigation">
        <Link href="/admin">Back to Admin</Link>
        {" | "}
        <Link href="/admin/tenants">View Tenants</Link>
      </nav>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
              <td>
                <button type="button">{user.status === "active" ? "Disable" : "Enable"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
