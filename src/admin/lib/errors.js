// Turns an API error into one line a person can act on.
//
// The CMS answers validation failures with error.details = [{ field, message }];
// the first of those is far more useful than the generic "Validation failed".
// Network failures surface as a bare TypeError from fetch, which says nothing
// to an admin, so they get a plain-language message instead.

export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  const first = err.details?.[0];
  if (first?.message) return first.field ? `${first.field}: ${first.message}` : first.message;
  if (err.name === "TypeError" && /fetch|network/i.test(err.message || "")) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (err.status === 401) return "Your session has expired. Please sign in again.";
  if (err.status === 403) return "You do not have permission to do that.";
  if (err.status === 404) return "That record no longer exists — it may have been deleted.";
  if (err.status >= 500) return fallback;
  return err.message || fallback;
}
