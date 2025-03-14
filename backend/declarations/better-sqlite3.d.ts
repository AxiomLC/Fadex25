declare module 'better-sqlite3' {
  interface DatabaseConstructor {
    new (filename: string, options?: { verbose?: (message: string) => void; fileMustExist?: boolean; readonly?: boolean }): Database;
  }

  interface Database {
    prepare<T>(sql: string): Statement<T>;
    exec(sql: string): this;
    close(): void;
    pragma<T = any>(param: string): T;
    open: boolean; // Added for getStatus
    transaction<T>(fn: () => T): () => T; // Added for storeOHLCV
  }

  interface Statement<T> {
    run(...params: any[]): this;
    get(...params: any[]): T | undefined;
    all(...params: any[]): T[];
    iterate(...params: any[]): IterableIterator<T>;
    finalize(): void;
  }

  const Database: DatabaseConstructor;
  export = Database;
}