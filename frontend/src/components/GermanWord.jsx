import { splitArticle } from '../utils/german';

export default function GermanWord({ text }) {
  const { article, noun } = splitArticle(text);
  if (!article) return <>{text}</>;
  return (
    <>
      <span className={`art art-${article}`}>{article}</span> {noun}
    </>
  );
}