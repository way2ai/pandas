export default function AdminPage() {
  return (
    <main>
      <h1>Admin Home</h1>
      <ul>
        <li>
          <a href="/admin/users">Users</a>
        </li>
        <li>
          <a href="/admin/tenants">Tenants</a>
        </li>
        <li>
          <a href="/app">Back to App</a>
        </li>
      </ul>
    </main>
  );
}
