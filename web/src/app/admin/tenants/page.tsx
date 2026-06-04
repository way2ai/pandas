import Link from "next/link";

export default function AdminTenantsPage() {
  return (
    <main>
      <h1>Tenants</h1>
      <nav aria-label="Tenant administration navigation">
        <Link href="/admin">Back to Admin</Link>
        {" | "}
        <Link href="/admin/users">View Users</Link>
      </nav>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>tenant-demo</td>
            <td>Demo Tenant</td>
            <td>active</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
