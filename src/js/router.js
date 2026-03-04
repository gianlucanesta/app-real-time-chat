import { isAuthenticated } from "./auth.js";

/**
 * Redirects to the login page if the user is not authenticated.
 * Call this as the first statement in protected page init functions.
 */
export function guardRoute() {
  if (!isAuthenticated()) {
    window.location.replace("index.html");
  }
}
