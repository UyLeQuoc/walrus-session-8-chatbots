import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** The unit of memory. One person can have many channel identities. */
export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** guest = memory under the operator account; owned = the person's own MemWalAccount */
  mode: text("mode", { enum: ["guest", "owned"] })
    .notNull()
    .default("guest"),
  accountId: text("account_id"),
  walletAddress: text("wallet_address"),
  memoryEnabled: boolean("memory_enabled").notNull().default(true),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelIdentities = pgTable(
  "channel_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    /** telegram | discord | slack | web | cli | wallet */
    channel: text("channel").notNull(),
    externalId: text("external_id").notNull(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("channel_identity_unique").on(t.channel, t.externalId)],
);

/** Per-person delegate keys registered on the person's own MemWalAccount. */
export const delegateKeys = pgTable(
  "delegate_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    publicKeyHex: text("public_key_hex").notNull(),
    /** AES-256-GCM under KEY_ENCRYPTION_KEY. Never the raw key. */
    privateKeyEnc: text("private_key_enc").notNull(),
    label: text("label").notNull(),
    status: text("status", { enum: ["pending", "active", "revoked"] })
      .notNull()
      .default("pending"),
    addTxDigest: text("add_tx_digest"),
    removeTxDigest: text("remove_tx_digest"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("delegate_keys_person_idx").on(t.personId)],
);

/**
 * Single-use, short-lived tokens. Three shapes share this table because they
 * share the same semantics: `connect` and `disconnect` carry a person from a
 * chat channel to the web wallet page, and a wallet sign-in challenge is a
 * nonce that belongs to nobody until somebody signs it, which is why
 * `personId` is nullable.
 */
export const connectTokens = pgTable("connect_tokens", {
  token: text("token").primaryKey(),
  personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["connect", "disconnect"] }).notNull(),
  delegateKeyId: uuid("delegate_key_id").references(() => delegateKeys.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webSessions = pgTable("web_sessions", {
  id: text("id").primaryKey(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Evidence: one row per turn, including which memories were injected. */
export const turnLog = pgTable(
  "turn_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    memoryEnabled: boolean("memory_enabled").notNull(),
    mode: text("mode").notNull(),
    model: text("model").notNull(),
    /** [{ blobId, distance, type }] */
    injected:
      jsonb("injected").$type<Array<{ blobId: string; distance: number; type: string | null }>>(),
    writes: integer("writes").notNull().default(0),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("turn_log_person_idx").on(t.personId, t.createdAt)],
);

/**
 * Local index of memories hippo wrote. Metadata only; the text lives on Walrus.
 *
 * A row is inserted the moment the relayer accepts the job, not when the blob
 * lands ~25 s later, so a deploy or crash in that window cannot lose the record
 * of a memory the user was already told about.
 */
export const memoryIndex = pgTable(
  "memory_index",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    namespace: text("namespace").notNull(),
    /** Null until the relayer finishes writing to Walrus. */
    blobId: text("blob_id"),
    jobId: text("job_id"),
    status: text("status", { enum: ["pending", "stored", "failed"] })
      .notNull()
      .default("pending"),
    error: text("error"),
    type: text("type").notNull(),
    textSha256: text("text_sha256").notNull(),
    channel: text("channel").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [index("memory_index_person_idx").on(t.personId, t.createdAt)],
);
