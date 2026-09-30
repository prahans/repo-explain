import { auth, signIn, signOut } from "@/auth";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/UserAvatar";

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
        <button type="submit" className="secondary-button auth-sign-in">
          <Icon name="github" size={17} />
          Sign in with GitHub
        </button>
      </form>
    );
  }

  return (
    <div className="auth-user">
      <div className="auth-profile">
        <UserAvatar
          image={session.user.image}
          name={session.user.name?.trim() || "GitHub user"}
        />
        <span
          className="auth-name"
          title={session.user.name?.trim() || "GitHub user"}
        >
          {session.user.name?.trim() || "GitHub user"}
        </span>
      </div>

      <form
        action={async () => {
          "use server";

          await signOut({
            redirectTo: "/",
          });
        }}
      >
        <button type="submit" className="auth-sign-out">
          Sign out
        </button>
      </form>
    </div>
  );
}
