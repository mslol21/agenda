import type { Database } from './types';

// This is a "Native" Local Database simulation for Antigravity IDE
// It replaces the Supabase cloud dependency with a local localStorage-based implementation.

const DB_KEY = 'antigravity_native_db';

type TableName = keyof Database['public']['Tables'];

const getDb = () => {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveDb = (db: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

class MockQueryBuilder {
  private filters: Array<(row: any) => boolean> = [];
  private pendingUpdate: any = null;
  private sortConfig: { col: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;

  constructor(private table: string) {}

  select(columns = '*') {
    // We ignore specific columns for this mock and return everything
    return this;
  }

  // Filter methods
  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((row) => row[column] <= value);
    return this;
  }

  // Update logic
  update(values: any) {
    this.pendingUpdate = values;
    return this;
  }

  // Insert logic
  insert(values: any) {
    // We handle insert immediately in this promise-like chain, but effectively we return a promise
    // that resolves to the result.
    const db = getDb();
    if (!db[this.table]) db[this.table] = [];

    const newRows = (Array.isArray(values) ? values : [values]).map((row: any) => ({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...row,
    }));

    db[this.table].push(...newRows);
    saveDb(db);

    // Return a dummy promise
    return {
      select: () => ({
        single: async () => ({ data: newRows[0], error: null }),
      }),
      then: (resolve: any) => resolve({ data: newRows, error: null }),
    } as any;
  }

  // Order logic
  order(column: string, { ascending = true } = {}) {
    this.sortConfig = { col: column, ascending };
    return this;
  }

  limit(count: number) {
      this.limitCount = count;
      return this;
  }

  // Execution
  then(resolve: (result: { data: any; error: any }) => void, reject: (err: any) => void) {
    try {
      const db = getDb();
      let rows = db[this.table] || [];

      // If it's an update
      if (this.pendingUpdate) {
        let updatedCount = 0;
        const newTableData = rows.map((row: any) => {
          const pass = this.filters.every((f) => f(row));
          if (pass) {
            updatedCount++;
            return { ...row, ...this.pendingUpdate };
          }
          return row;
        });
        db[this.table] = newTableData;
        saveDb(db);
        resolve({ data: null, error: null });
        return;
      }

      // If it's a select
      // Apply filters
      let result = rows.filter((row: any) => this.filters.every((f) => f(row)));

      // Apply sort
      if (this.sortConfig) {
        const { col, ascending } = this.sortConfig;
        result.sort((a: any, b: any) => {
          if (a[col] < b[col]) return ascending ? -1 : 1;
          if (a[col] > b[col]) return ascending ? 1 : -1;
          return 0;
        });
      }
      
      if (this.limitCount !== null) {
          result = result.slice(0, this.limitCount);
      }

      resolve({ data: result, error: null });
    } catch (err: any) {
      resolve({ data: null, error: err });
    }
  }
}

// Emulate the Supabase client interface
export const supabase = {
  from: (table: string) => new MockQueryBuilder(table),
} as any;
