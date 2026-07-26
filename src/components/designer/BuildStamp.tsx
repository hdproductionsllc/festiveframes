/**
 * The running build's commit, shown in the corner of the school builder.
 *
 * Telling a stale TAB from a stale DEPLOY was guesswork: a change ships, the page
 * looks unchanged, and there is no way to know which of the two is at fault. With
 * the commit on screen that question is answerable in one glance — read it out and
 * it either matches what was merged or it does not.
 *
 * Deliberately tiny and low-contrast: useful when you go looking for it, invisible
 * the rest of the time. Falls back to "dev" outside a deploy.
 */
export function BuildStamp() {
  const id = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
  return (
    <span
      title="Deployed build — quote this when reporting something"
      className="pointer-events-none select-none font-mono text-[10px] tracking-wide text-[#1e1b17]/35"
    >
      build {id}
    </span>
  );
}
