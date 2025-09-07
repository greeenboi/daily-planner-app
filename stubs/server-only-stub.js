// Generic server-only module stub to prevent Metro from trying to bundle
// Node/native binary packages (e.g. libsql, prisma adapters) into the
// React Native client bundle. Any accidental usage will throw clearly.
module.exports = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'A server-only module was imported in the client bundle. Move this logic to an API route or server environment.'
      );
    },
    apply() {
      throw new Error('Attempted to call a server-only module in the client bundle.');
    },
    construct() {
      throw new Error('Attempted to construct a server-only module in the client bundle.');
    },
  }
);
