import { ExternalLink, Info } from "lucide-react";
import { SORTED_GLOSSARY, findGlossaryEntry } from "../lib/photographyGlossary";
import type { PhotographyGlossaryEntry } from "../lib/photographyGlossary";

type TermBubbleProps = {
  entry: PhotographyGlossaryEntry;
};

type RichTextWithTermsProps = {
  text: string;
};

function TermBubble({ entry }: TermBubbleProps) {
  return (
    <span className="group relative inline-flex align-baseline">
      <button
        type="button"
        className="inline-flex items-center gap-0.5 rounded-sm border-b border-dotted border-cobalt px-0.5 font-semibold text-cobalt outline-none transition hover:bg-cobalt/10 focus:bg-cobalt/10 focus:ring-2 focus:ring-cobalt/20"
        aria-label={`${entry.term}：${entry.explanation}`}
      >
        {entry.term}
        <Info className="h-3 w-3" aria-hidden="true" />
      </button>
      <span className="absolute left-0 top-full z-40 hidden w-[min(320px,calc(100vw-48px))] pt-2 group-focus-within:block group-hover:block">
        <span className="block rounded-md border border-line bg-cream p-3 text-left text-dark-ink">
          <span className="block text-sm font-semibold">{entry.term}</span>
          <span className="mt-1 block text-xs leading-5 text-dark-ink/70">{entry.explanation}</span>
          <span className="mt-2 block rounded-md bg-cream-alt px-2 py-1.5 text-xs leading-5 text-dark-ink/60">
            {entry.note}
          </span>
          <span className="mt-2 flex flex-col gap-1.5">
            {entry.links.map((link) => (
              <a
                key={link.url}
                className="inline-flex items-center gap-1 text-xs font-medium text-cobalt hover:underline"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

export function RichTextWithTerms({ text }: RichTextWithTermsProps) {
  const segments: Array<{ value: string; term?: string }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = SORTED_GLOSSARY.find((entry) => text.startsWith(entry.term, cursor));

    if (match) {
      segments.push({ value: match.term, term: match.term });
      cursor += match.term.length;
    } else {
      segments.push({ value: text[cursor] });
      cursor += 1;
    }
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (!segment.term) {
          return <span key={`${segment.value}-${index}`}>{segment.value}</span>;
        }

        const entry = findGlossaryEntry(segment.term);
        if (!entry) {
          return <span key={`${segment.value}-${index}`}>{segment.value}</span>;
        }

        return <TermBubble key={`${segment.term}-${index}`} entry={entry} />;
      })}
    </>
  );
}
