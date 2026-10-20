import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommentForm } from '@/components/blog/comment-form';
import { SafeMarkdown } from '@/components/blog/safe-markdown';
import { AppError } from '@/server/errors/app-error';
import { getPublishedPost } from '@/server/modules/blog/blog-public.service';
import { getSessionUser } from '@/server/security/session';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await getPublishedPost(decodeURIComponent(slug));
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    console.error('[bama] blog detail unavailable:', e);
    notFound();
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { post } = await load((await params).slug);
  return { title: post.seoTitle ?? post.title, description: post.seoDescription ?? post.excerpt, alternates: { canonical: `/blog/${encodeURIComponent(post.slug)}` } };
}

export default async function BlogPostPage({ params }: Props) {
  const { post, comments } = await load((await params).slug);
  const user = await getSessionUser();
  return (
    <article className="container max-w-3xl space-y-6 py-12">
      <header className="space-y-2">
        {post.categoryName && <p className="text-sm text-primary">{post.categoryName}</p>}
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="text-sm text-ink/60">{post.author.name}{post.publishedAt ? ` · ${post.publishedAt.toLocaleDateString('fa-IR')}` : ''}</p>
      </header>
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="w-full rounded-2xl" loading="lazy" referrerPolicy="no-referrer" />
      )}
      <SafeMarkdown source={post.content} />
      <section aria-labelledby="comments" className="space-y-4 border-t border-ink/[.08] pt-6">
        <h2 id="comments" className="text-xl font-bold">نظرات</h2>
        {comments.length === 0 ? <p className="text-sm text-ink/60">هنوز نظری ثبت نشده است.</p> : (
          <ul className="space-y-3">{comments.map((c) => <li key={c.id} className="rounded-xl bg-primary-soft/50 p-4 text-sm"><p className="font-semibold">{c.user.name}</p><p className="whitespace-pre-wrap">{c.body}</p></li>)}</ul>
        )}
        {user ? <CommentForm slug={post.slug} /> : <p className="text-sm"><Link href={`/login?next=/blog/${encodeURIComponent(post.slug)}`} className="text-primary underline">برای ثبت نظر وارد شوید</Link></p>}
      </section>
    </article>
  );
}
