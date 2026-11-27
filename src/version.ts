const REPO_URL = 'https://github.com/Yanis-Kouidri/singing-made-easy';

export interface VersionInfo {
  /** Text to display, e.g. "v0.1.0 · 1a2b3c4". */
  label: string;
  /** Link to the built commit on GitHub, or the repository when unknown. */
  url: string;
}

export function versionInfo(version: string, commitSha: string): VersionInfo {
  if (!commitSha) return { label: `v${version}`, url: REPO_URL };
  return { label: `v${version} · ${commitSha.slice(0, 7)}`, url: `${REPO_URL}/commit/${commitSha}` };
}
