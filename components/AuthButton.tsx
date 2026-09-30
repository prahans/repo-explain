import { auth, signIn, signOut } from "@/auth";

export async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";

          await signIn("github", {
            redirectTo: "/",
          });
        }}
      >
        <button type="submit" className="primary-button">
          Sign in with GitHub
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium">
          {session.user.name ?? "GitHub user"}
        </p>

        {session.user.email && (
          <p className="text-xs text-muted">{session.user.email}</p>
        )}
      </div>

      <form
        action={async () => {
          "use server";

          await signOut({
            redirectTo: "/",
          });
        }}
      >
        <button type="submit" className="text-link">
          Sign out
        </button>
      </form>
    </div>
  );
}
