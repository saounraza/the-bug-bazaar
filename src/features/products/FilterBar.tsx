import { useEffect, useId, useRef, useState } from 'react';
import { CATEGORIES, isCategory, isSortOption, type SortOption } from '../../api/types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { ProductFilters } from './productsApi';

export const SEARCH_DEBOUNCE_MS = 300;

const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'rating-desc': 'Top rated',
  'name-asc': 'Name: A to Z',
};

const CATEGORY_LABELS = {
  keyboards: 'Keyboards',
  ducks: 'Rubber ducks',
  coffee: 'Coffee',
  stickers: 'Stickers',
} as const;

type FilterBarProps = {
  filters: ProductFilters;
  onChange: (patch: Partial<ProductFilters>, options?: { replace?: boolean }) => void;
  onClear: () => void;
  isFiltered: boolean;
  debounceMs?: number;
};

export function FilterBar({
  filters,
  onChange,
  onClear,
  isFiltered,
  debounceMs = SEARCH_DEBOUNCE_MS,
}: FilterBarProps) {
  const id = useId();
  const urlSearch = filters.search;

  // The input shows what the user is typing right now; the URL only gets the
  // debounced value. `syncedUrl` lets us notice when the URL changed from
  // outside (Back button, Clear filters) and copy that into the input.
  const [text, setText] = useState(urlSearch);
  const [syncedUrl, setSyncedUrl] = useState(urlSearch);
  const debounced = useDebouncedValue(text, debounceMs);

  if (syncedUrl !== urlSearch) {
    setSyncedUrl(urlSearch);
    // If the URL now equals what we pushed, the user may already have typed
    // more, so leave the input alone. Otherwise the change came from outside.
    if (urlSearch !== debounced) setText(urlSearch);
  }

  const lastDebounced = useRef(debounced);
  useEffect(() => {
    if (lastDebounced.current === debounced) return;
    lastDebounced.current = debounced;
    if (debounced === urlSearch) return;
    // Starting a search adds a history entry (so Back returns to the full
    // list); refining an existing search replaces it, so Back is not flooded
    // with one entry per keystroke.
    onChange({ search: debounced }, { replace: urlSearch !== '' });
  }, [debounced, urlSearch, onChange]);

  return (
    <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
      <div className="field field--search">
        <label htmlFor={`${id}-search`}>Search products</label>
        <input
          id={`${id}-search`}
          type="search"
          value={text}
          placeholder="Try “duck” or “espresso”"
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor={`${id}-category`}>Category</label>
        <select
          id={`${id}-category`}
          value={filters.category ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            onChange({ category: isCategory(value) ? value : null });
          }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${id}-sort`}>Sort by</label>
        <select
          id={`${id}-sort`}
          value={filters.sort}
          onChange={(event) => {
            const value = event.target.value;
            if (isSortOption(value)) onChange({ sort: value });
          }}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => onChange({ inStock: event.target.checked })}
          />
          In stock only
        </label>
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={onClear}
          disabled={!isFiltered}
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}
