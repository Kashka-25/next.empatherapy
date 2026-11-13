import { parseBody } from '@/lib/posts.mjs';

/** Renders a post's body from plain text. Only paragraphs, headings and lists exist, and React escapes every character. */
export default function PostBody({ body }) {
  return (
    <div className="post-body">
      {parseBody(body).map((b, i) => {
        if (b.type === 'h') return <h2 key={i}>{b.text}</h2>;
        if (b.type === 'ul') return <ul key={i}>{b.items.map((t, j) => <li key={j}>{t}</li>)}</ul>;
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
