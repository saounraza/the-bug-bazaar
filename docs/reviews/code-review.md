# Code review notes: <partner's name>'s pull request

> Template for D5-6. Leave the comments **on the pull request itself** (inline, on the lines),
> then copy links here for your own record.
> Done when: at least 5 useful comments covering correctness, readability and accessibility,
> plus one piece of praise. Also reply to the comments on your own PR.

- **PR reviewed:** <link>
- **Reviewer:** <your name>

## Comments left

| #   | Type          | File:line | Comment (short)                                                                                                          | Link |
| --- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1   | Correctness   |           | e.g. "This effect has no cleanup, so the timer keeps running after unmount. Suggest returning `() => clearTimeout(id)`." |      |
| 2   | Correctness   |           |                                                                                                                          |      |
| 3   | Readability   |           | e.g. "`data2` → `filteredProducts`? I had to read the whole function to know what it holds."                             |      |
| 4   | Accessibility |           | e.g. "This `<div onClick>` isn't reachable by keyboard. A `<button>` gets focus and Enter/Space for free."               |      |
| 5   | Accessibility |           |                                                                                                                          |      |
| 6   | Praise        |           | e.g. "Really clean error union here; the exhaustive switch caught a case I'd have missed."                               |      |

## Checklist I used

- Correctness: effects clean up; no stale closures; errors handled; a retry can't double-submit;
  money in integer cents; no `any`.
- Readability: names say what things are; functions do one thing; comments explain _why_.
- Accessibility: labels on inputs; real buttons and links; focus visible; errors announced;
  images have alt text (or `alt=""` if decorative).

## Responses to comments on my PR

| Comment | My response | Changed? (commit) |
| ------- | ----------- | ----------------- |
|         |             |                   |
