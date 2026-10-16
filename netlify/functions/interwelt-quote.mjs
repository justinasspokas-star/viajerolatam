/**
 * Private Netlify Functions adapter for the INTERWELT quoting pilot.
 * Shared core lives in /interwelt-worker/worker.js.
 * No secrets are ever returned to the browser or committed to git.
 */
import worker from "../../interwelt-worker/worker.js";

export default async function interweltQuote(request) {
  if (request.method !== "POST" && request.method !== "GET") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }
  const url = new URL(request.url);
  url.pathname = request.method === "GET" ? "/health" : "/api/quote";
  // Reuse Netlify's request; the core returns Response objects.
  const forwardedRequest = new Request(url, request);
  return worker.fetch(forwardedRequest, process.env);
}
