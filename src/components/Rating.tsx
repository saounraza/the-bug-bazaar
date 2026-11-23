type RatingProps = { value: number };

export function Rating({ value }: RatingProps) {
  return (
    <span className="rating" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span aria-hidden="true">★ {value.toFixed(1)}</span>
    </span>
  );
}
