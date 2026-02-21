export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <h2 className="font-serif text-2xl font-medium text-foreground">Your library is waiting.</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Add your first book to begin.
      </p>
    </div>
  );
}
