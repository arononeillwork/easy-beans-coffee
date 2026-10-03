/**
 * Ambient types for the vendored common-lib helpers.
 *
 * common-lib is resolved at runtime via the `@common-lib` bundler alias in
 * next.config.ts. We declare its public surface here (instead of
 * type-checking the vendored source) so the app keeps clean types without
 * modifying that shared library.
 */
declare module '@common-lib/integrations/supabase/BaseService' {
  import type { SupabaseClient } from '@supabase/supabase-js';

  /**
   * `id` is widened to `string | number` here. The vendored source constrains it
   * to `string`, but every method just hands the value to PostgREST's `.eq()`,
   * which takes either — and our `ToDo` table has a bigint key, so ids really do
   * arrive as numbers.
   */
  export class BaseService<T extends { id: string | number }> {
    constructor(client: SupabaseClient, tableName: string);
    /** Declared so subclasses can run a query the base class doesn't cover. */
    protected client: SupabaseClient;
    protected tableName: string;
    getAll(
      filters?: Record<string, unknown>,
      orderBy?: { column: string; ascending?: boolean },
    ): Promise<T[]>;
    getById(id: string | number): Promise<T | null>;
    create(data: Partial<T>): Promise<T | null>;
    update(id: string | number, updates: Partial<T>): Promise<T | null>;
    delete(id: string | number): Promise<boolean>;
  }
}

declare module '@common-lib/integrations/email' {
  import type { Transporter } from 'nodemailer';

  export interface SMTPConfig {
    readonly host: string;
    readonly port: number;
    readonly secure: boolean;
    readonly auth: { readonly user: string; readonly pass: string };
  }

  /** Throws when SMTP_HOST/SMTP_PORT/EMAIL_USER/EMAIL_PASS are not all set. */
  export function getSMTPConfig(): SMTPConfig;
  export function createTransporter(config: SMTPConfig): Transporter;
  export function verifyConnection(transporter: Transporter): Promise<boolean>;
  export function createVerifiedTransporter(): Promise<Transporter>;
}

declare module '@common-lib/integrations/supabase/supabaseClient' {
  import type { SupabaseClient } from '@supabase/supabase-js';

  /** Singleton browser client; effectively null when env vars are missing. */
  export const supabase: SupabaseClient;
}
