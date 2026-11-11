// Runs once when the server starts. The Node-only work lives in its own file so
// the edge bundle never pulls in node:fs.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
