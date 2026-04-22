// Content moderation — blocked terms for user-supplied monster names.
// Covers common English profanity and racial/ethnic slurs.
const BLOCKED_TERMS = [
  // profanity
  "fuck","shit","bitch","cunt","cock","dick","pussy","asshole","bastard",
  "whore","slut","piss","fag","faggot","dyke","tranny","retard","spaz",
  // racial / ethnic slurs
  "nigger","nigga","chink","gook","kike","spic","wetback","beaner",
  "cracker","honky","towelhead","raghead","zipperhead","jap","slant",
  "coon","porch monkey","jungle bunny","redskin","squaw","hymie","wop",
  "dago","polack","kraut","mick","paddy","limey","frog","greaseball",
];

// Build one regex that matches any blocked term as a substring (case-insensitive).
const BLOCKED_RE = new RegExp(BLOCKED_TERMS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");

export interface NameCheckResult {
  ok:     boolean;
  reason?: string;
}

export function checkName(name: string): NameCheckResult {
  const trimmed = name.trim();
  if (trimmed.length === 0)  return { ok: false, reason: "Name can't be empty." };
  if (trimmed.length > 20)   return { ok: false, reason: "Name must be 20 characters or fewer." };
  if (!/^[\w' -]+$/.test(trimmed)) return { ok: false, reason: "Only letters, numbers, spaces, hyphens and apostrophes are allowed." };
  if (BLOCKED_RE.test(trimmed))    return { ok: false, reason: "That name isn't allowed." };
  return { ok: true };
}
