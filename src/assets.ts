// Every image / icon URL goes through asset(). In the dev project it is just
// the public path; the single-file share build swaps this module for one that
// embeds the files.
export const asset = (name: string): string => `${import.meta.env.BASE_URL}assets/${name}`;
