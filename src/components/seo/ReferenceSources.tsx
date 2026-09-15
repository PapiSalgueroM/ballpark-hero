import { Fragment } from 'react';

interface ReferenceSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

export default function ReferenceSources({ label, sourceIds, sourceById }: {
  label: string;
  sourceIds: readonly string[];
  sourceById: (id: string) => ReferenceSource | undefined;
}) {
  const sources = sourceIds.map(sourceById).filter((source): source is ReferenceSource => !!source);

  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Sources for {label}:{' '}
      {sources.map((source, i) => (
        <Fragment key={source.id}>
          {i > 0 && ' '}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center min-h-[32px] max-w-full text-primary hover:underline">
            {source.publisher}: {source.title}
          </a>
        </Fragment>
      ))}
    </p>
  );
}
