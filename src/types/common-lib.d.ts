/**
 * Ambient types for the vendored common-lib Supabase helpers.
 *
 * common-lib is resolved at runtime via the Vite `@common-lib` alias. We declare
 * its public surface here (instead of type-checking the vendored source) so the
 * app keeps clean types without modifying that shared library.
 */
declare module '@common-lib/integrations/supabase/BaseService' {
  import type { SupabaseClient } from '@supabase/supabase-js';

  export class BaseService<T extends { id: string }> {
    constructor(client: SupabaseClient, tableName: string);
    getAll(
      filters?: Record<string, unknown>,
      orderBy?: { column: string; ascending?: boolean },
    ): Promise<T[]>;
    getById(id: string): Promise<T | null>;
    create(data: Partial<T>): Promise<T | null>;
    update(id: string, updates: Partial<T>): Promise<T | null>;
    delete(id: string): Promise<boolean>;
  }
}
