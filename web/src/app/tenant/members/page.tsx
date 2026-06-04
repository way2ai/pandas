import Link from "next/link";

const members = [
  { email: "member@example.com", role: "tenant_member", status: "active" },
  { email: "owner@example.com", role: "tenant_admin", status: "active" },
];

export default function TenantMembersPage() {
  return (
    <main>
      <h1>Members</h1>
      <nav aria-label="Tenant membership navigation">
        <Link href="/tenant">Back to Tenant</Link>
        {" | "}
        <Link href="/app">Back to App</Link>
      </nav>
      <p>Invite a new tenant member and review current access.</p>
      <form>
        <label>
          Invite email
          <input name="invite_email" type="email" />
        </label>
        <label>
          Role
          <select name="role" defaultValue="tenant_member">
            <option value="tenant_member">tenant_member</option>
            <option value="tenant_admin">tenant_admin</option>
          </select>
        </label>
        <button type="submit">Send invite</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.email}>
              <td>{member.email}</td>
              <td>{member.role}</td>
              <td>{member.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
