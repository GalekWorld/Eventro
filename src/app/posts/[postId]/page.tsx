import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageCircle, Send } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isBlockedBetween } from "@/lib/privacy";
import { parsePostContent } from "@/lib/post-content";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { togglePostLikeAction } from "@/app/actions/social";
import { PostActions } from "@/components/post-actions";
import { PostCommentForm } from "@/components/forms/post-comment-form";
import { CommentActions } from "@/components/comment-actions";

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const user = await getCurrentUser();
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          city: true,
          avatarUrl: true,
          isVerified: true,
          role: true,
        },
      },
      likes: user ? { where: { userId: user.id }, select: { id: true } } : false,
      comments: {
        where: { hiddenAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
              isVerified: true,
              role: true,
            },
          },
          likes: user ? { where: { userId: user.id }, select: { id: true } } : false,
          _count: {
            select: { likes: true },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: { where: { hiddenAt: null } },
        },
      },
    },
  });

  if (!post || post.hiddenAt) {
    notFound();
  }

  if (user && (await isBlockedBetween(user.id, post.authorId))) {
    notFound();
  }

  const liked = Array.isArray(post.likes) && post.likes.length > 0;
  const parsedPost = parsePostContent(post.content);
  const redirectPath = `/posts/${post.id}`;

  return (
    <div className="mx-auto max-w-[980px] px-0 sm:px-4">
      <article className="app-card overflow-hidden rounded-none border-x-0 sm:rounded-[28px] sm:border-x">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="bg-black">
            {post.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt={parsedPost.content} className="aspect-square w-full object-cover lg:min-h-[720px]" />
            ) : (
              <div className="flex aspect-square min-h-[420px] items-center justify-center p-8 text-center text-base text-white/85 lg:min-h-[720px]">
                <div className="max-w-xl">
                  <p>{parsedPost.content}</p>
                  {parsedPost.location ? <p className="mt-3 text-sm font-medium text-white/60">{parsedPost.location}</p> : null}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="app-story-ring rounded-full p-[2px]">
                  <UserAvatar user={post.author} className="h-11 w-11" textClassName="text-sm" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/u/${post.author.username ?? ""}`} className="truncate text-sm font-semibold text-slate-950">
                      @{post.author.username ?? "usuario"}
                    </Link>
                    {isPubliclyVerified(post.author) ? <VerifiedBadge tone={getVerificationTone(post.author)} /> : null}
                  </div>
                  {post.author.name || post.author.city ? (
                    <p className="truncate text-xs text-slate-500">
                      {post.author.name ?? ""}
                      {post.author.city ? `${post.author.name ? " · " : ""}${post.author.city}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              <Link href={`/u/${post.author.username ?? ""}`} className="text-xs font-medium text-sky-600">
                Ver perfil
              </Link>
            </div>

            <div className="border-b border-neutral-200 px-4 py-4">
              <p className="text-sm leading-7 text-slate-800">
                <span className="mr-2 font-semibold">@{post.author.username ?? "usuario"}</span>
                {parsedPost.content}
              </p>
              {parsedPost.location ? <p className="mt-2 text-xs font-medium text-slate-500">Ubicacion: {parsedPost.location}</p> : null}
            </div>

            <div className="border-b border-neutral-200 px-4 py-4">
              <div className="flex items-center gap-4 text-slate-800">
                {user ? (
                  <form action={togglePostLikeAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="redirectPath" value={redirectPath} />
                    <button type="submit" className={`transition ${liked ? "text-rose-500" : "text-slate-800"}`} aria-label="Dar like">
                      <Heart className={`h-6 w-6 ${liked ? "fill-current" : ""}`} />
                    </button>
                  </form>
                ) : (
                  <Heart className="h-6 w-6" />
                )}
                <MessageCircle className="h-6 w-6" />
                <Link href={`/u/${post.author.username ?? ""}`} aria-label="Abrir perfil">
                  <Send className="h-6 w-6" />
                </Link>
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-950">
                {post._count.likes} me gusta · {post._count.comments} comentarios
              </p>

              {user && post.authorId === user.id ? (
                <PostActions postId={post.id} initialContent={parsedPost.content} redirectPath={redirectPath} canDelete />
              ) : null}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 lg:max-h-[420px]">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <UserAvatar user={comment.author} className="h-8 w-8 bg-neutral-100" textClassName="text-xs" />
                  <div className="min-w-0 flex-1 rounded-2xl bg-neutral-50 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/u/${comment.author.username ?? ""}`} className="text-xs font-semibold text-slate-950">
                        @{comment.author.username ?? "usuario"}
                      </Link>
                      {isPubliclyVerified(comment.author) ? <VerifiedBadge tone={getVerificationTone(comment.author)} /> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{comment.body}</p>
                    {user ? (
                      <CommentActions
                        commentId={comment.id}
                        initialBody={comment.body}
                        redirectPath={redirectPath}
                        liked={Array.isArray(comment.likes) && comment.likes.length > 0}
                        likeCount={comment._count.likes}
                        canDelete={comment.author.id === user.id || post.author.id === user.id || user.role === "ADMIN"}
                        canEdit={comment.author.id === user.id}
                      />
                    ) : null}
                  </div>
                </div>
              ))}

              {post.comments.length === 0 ? <p className="text-sm text-slate-500">Todavia no hay comentarios en esta publicacion.</p> : null}
            </div>

            <div className="border-t border-neutral-200 px-4 py-4">
              {user ? <PostCommentForm postId={post.id} redirectPath={redirectPath} /> : <p className="text-sm text-slate-500">Inicia sesion para comentar.</p>}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
