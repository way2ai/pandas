export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <form>
        <label>
          Email or username
          <input name="identifier" />
        </label>
        <label>
          Password
          <input name="password" type="password" />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
