export function QualityDots({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-sm ${
            i < rating ? "bg-amber" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}
