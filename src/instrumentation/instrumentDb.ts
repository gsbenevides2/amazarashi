import { SpanKind, trace } from "@opentelemetry/api";
import type { SQL } from "bun";
import { dbDuration } from "./metrics";
import { recordSpanError, safeJson } from "./span";

/** "SELECT * FROM users" -> { operation: "SELECT", table: "users" } */
function parseStatement(statement: string) {
  const operation = statement.trimStart().split(/\s+/, 1)[0]?.toUpperCase() ?? "QUERY";
  const table = statement.match(/\b(?:from|into|update)\s+"?([\w.]+)"?/i)?.[1];
  return { operation, table };
}

const tracer = () => trace.getTracer("db");

async function runTraced<T>(attributes: Record<string, string>, execute: () => Promise<T>): Promise<T> {
  const { operation, table } = parseStatement(attributes["db.query.text"]!);
  const start = performance.now();
  return tracer().startActiveSpan(
    table ? `${operation} ${table}` : operation,
    { kind: SpanKind.CLIENT, attributes: { ...attributes, "db.operation.name": operation, ...(table && { "db.collection.name": table }) } },
    async (span) => {
      try {
        const result = await execute();
        span.setAttribute("db.response.body", safeJson(result));
        span.setAttribute("db.response.row_count", Array.isArray(result) ? result.length : 1);
        return result;
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        dbDuration.record(performance.now() - start, { "db.operation.name": operation, ...(table && { "db.collection.name": table }) });
        span.end();
      }
    },
  );
}

/**
 * SQL.Query do Bun é lazy e thenable: o Drizzle encadeia `.values()`/`.catch()` antes do await e esses
 * métodos devolvem a mesma instância; sobrescrever o `.then` dela basta para interceptar a execução real.
 */
function traceQuery<T>(serverAddress: string, statement: string, params: unknown[], query: SQL.Query<T>): SQL.Query<T> {
  const originalThen = query.then.bind(query);
  query.then = ((onFulfilled, onRejected) =>
    runTraced(
      { "db.system.name": "postgresql", "server.address": serverAddress, "db.query.text": statement, "db.query.parameters": safeJson(params) },
      () => new Promise<T>((resolve, reject) => originalThen(resolve, reject)),
    ).then(onFulfilled, onRejected)) as SQL.Query<T>["then"];
  return query;
}

/** Envolve o client SQL do Bun: cada query vira um span com o statement executado e as linhas devolvidas. */
export function instrumentDb(client: SQL, connectionUrl: string): SQL {
  const serverAddress = new URL(connectionUrl).hostname;
  return new Proxy(client, {
    apply(target, _this, args: [TemplateStringsArray, ...unknown[]]) {
      const [strings, ...values] = args;
      const query = Reflect.apply(target as unknown as (...a: unknown[]) => SQL.Query<unknown>, target, args);
      return traceQuery(serverAddress, strings.join("?"), values, query);
    },
    get(target, prop) {
      if (prop === "unsafe") {
        return (text: string, values?: unknown[] | Record<string, unknown>) =>
          traceQuery(serverAddress, text, Array.isArray(values) ? values : values ? [values] : [], target.unsafe(text, values as never));
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as SQL;
}
