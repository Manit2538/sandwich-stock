export default function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="card text-center text-stone-500 dark:text-stone-400">
      <p className="text-3xl">📭</p>
      <p className="mt-2 font-medium">{text}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
    </div>
  );
}
