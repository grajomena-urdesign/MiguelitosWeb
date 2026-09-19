declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    POS_AUTH_SECRET?: string;
  }
}
