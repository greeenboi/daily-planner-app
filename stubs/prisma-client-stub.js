// Minimal stub to avoid bundling Prisma in native apps.
// Any accidental imports will throw clearly at runtime in native.
module.exports = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "@prisma/client is server-only and cannot be used in a React Native bundle. " +
          "Move Prisma usage to server-only files (e.g., app/api/*)."
      );
    },
    apply() {
      throw new Error("@prisma/client is server-only.");
    },
    construct() {
      throw new Error("@prisma/client is server-only.");
    },
  }
);
