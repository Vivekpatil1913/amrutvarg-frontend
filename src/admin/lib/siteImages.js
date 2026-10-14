import heroMain from "../../assets/varg-3.jpg";
import heroSmall from "../../assets/varg-1.jpg";
import aboutPhoto from "../../assets/varg-2.jpg";

// The photographs shipped with the site, mapped to the slot each one fills.
//
// A slot with no uploaded image falls back to these on the public pages, so the
// admin shows the same picture rather than the words "bundled photograph" —
// what you see here is what a visitor sees.
//
// Keep in step with the imports in src/components/sections/Hero.jsx and
// About.jsx; those are the components that actually render them.
export const BUNDLED = {
  hero: { main: heroMain, small: heroSmall },
  about: { image: aboutPhoto },
};

// Resolves what to display for an image slot: the uploaded file if there is
// one, otherwise the bundled photograph.
export const imageSrc = (url, fallback) => url || fallback || "";

// The three programme photographs a story can use as its cover without an
// upload, keyed the way the stories table stores them in image_key.
export const STORY_PHOTOS = {
  varg1: heroSmall,
  varg2: aboutPhoto,
  varg3: heroMain,
};

export const STORY_PHOTO_OPTIONS = [
  { value: "", label: "None — show generated artwork" },
  { value: "varg1", label: "Programme photo 1 — students seated in a hall" },
  { value: "varg2", label: "Programme photo 2 — courtyard session" },
  { value: "varg3", label: "Programme photo 3 — exercise session" },
];

// What a story's cover should show: an uploaded photograph first, then a
// bundled programme photo, otherwise nothing — the card draws its own motif.
export const storyCover = (story) =>
  story?.image_url || STORY_PHOTOS[story?.image_key] || "";
