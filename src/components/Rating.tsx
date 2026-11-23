type RatingProps = { value: number };

export function Rating({ value }: RatingProps) {
  const rating = value.toFixed(1);
  // Screen readers get the sentence; sighted users get the compact star.
  // (aria-label on a plain <span> is not reliably announced, so hidden text is used.)
  return (
    <span className="rating">
      <span aria-hidden="true">★ {rating}</span>
      <span className="visually-hidden">Rated {rating} out of 5</span>
    </span>
  );
}
