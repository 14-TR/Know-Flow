/**
 * Skeleton placeholder cards shown while list data is loading.
 * Matches the .list-card layout so the screen doesn't jump on load.
 */

function CardSkeleton() {
  return (
    <div className="list-card skeleton-card" aria-hidden="true">
      <div className="list-card-body">
        <div className="skeleton-icon" />
        <div className="list-card-content">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--desc" />
          <div className="skeleton-line skeleton-line--meta" />
        </div>
      </div>
      <div className="skeleton-actions">
        <div className="skeleton-btn" />
        <div className="skeleton-btn" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="list-grid" aria-busy="true" aria-label="Loading…">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="page-spinner" aria-label="Loading…">
      <div className="spinner" />
    </div>
  );
}
