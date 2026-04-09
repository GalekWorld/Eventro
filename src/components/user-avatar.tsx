import { getAvatarFallback } from "@/lib/user-display";

type UserAvatarProps = {
  user: {
    avatarUrl?: string | null;
    username?: string | null;
    name?: string | null;
    email?: string | null;
  };
  className?: string;
  textClassName?: string;
};

export function UserAvatar({
  user,
  className = "h-10 w-10",
  textClassName = "text-sm",
}: UserAvatarProps) {
  return (
    <div className={`overflow-hidden rounded-full bg-white ${className}`}>
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={`Avatar de @${user.username ?? "usuario"}`} className="h-full w-full object-cover" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center font-semibold text-slate-900 ${textClassName}`}>
          {getAvatarFallback(user)}
        </div>
      )}
    </div>
  );
}
