/**
 * Local editorial texture assets (public/images/editorial).
 * Themes: paper grain, archives, reading, knowledge.
 */
export const EDITORIAL_IMAGES = {
  /** Kraft paper grain — hero & panel accents */
  heroPaper: "/images/editorial/hero-paper.jpg",
  /** Lined notebook — reading / notes */
  linedPaper: "/images/editorial/lined-paper.jpg",
  /** Open book pages — knowledge archive */
  archivePages: "/images/editorial/archive-pages.jpg",
  /** Halftone grain abstract */
  grainAbstract: "/images/editorial/grain-abstract.jpg",
  /** Study desk notes — bookmarks / research */
  studyNotes: "/images/editorial/study-notes.jpg",
} as const;

export const HERO_IMAGE = EDITORIAL_IMAGES.heroPaper;
