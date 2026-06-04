export default function AppPage() {
  return (
    <main>
      <h1>App Home</h1>
      <ul>
        <li>
          <a href="/tenant">Tenant Area</a>
        </li>
        <li>
          <a href="/tenant/members">Tenant Members</a>
        </li>
        <li>
          <a href="/admin">Admin Area</a>
        </li>
        <li>
          <a href="/admin/users">Admin Users</a>
        </li>
        <li>
          <a href="/admin/tenants">Admin Tenants</a>
        </li>
      </ul>
    </main>
  );
}
