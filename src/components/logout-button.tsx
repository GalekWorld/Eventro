import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className="app-button-secondary w-full" type="submit">
        Salir
      </button>
    </form>
  );
}
