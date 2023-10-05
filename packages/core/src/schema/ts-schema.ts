import { Column, ID, IT, Scalar, Table } from "./ts-types";

const _addColumn = <
  TTable extends Table,
  TName extends string,
  TType extends Scalar,
  TOptional extends "id" extends TName ? false : boolean = false,
  TList extends "id" extends TName ? false : boolean = false
>(
  table: TTable,
  name: TName,
  type: TType,
  modifiers?: { optional?: TOptional; list?: TList }
) =>
  ({
    ...table,
    [name]: {
      type,
      optional: modifiers?.optional ?? false,
      list: modifiers?.list ?? false,
    },
  } as Table<
    TTable["name"],
    TTable["columns"] & Record<TName, Column<TType, TOptional, TList>>
  >);

const addColumn = <
  TTable extends Table,
  TName extends string,
  TType extends Scalar,
  TOptional extends "id" extends TName ? false : boolean = false,
  TList extends "id" extends TName ? false : boolean = false
>(
  table: TTable,
  name: TName,
  type: TType,
  modifiers?: { optional?: TOptional; list?: TList }
): IT<
  TTable["name"],
  TTable["columns"] & Record<TName, Column<TType, TOptional, TList>>
> => {
  const newTable = _addColumn(table, name, type, modifiers);

  return {
    table: newTable,
    addColumn: <
      TName extends string,
      TType extends Scalar,
      TOptional extends "id" extends TName ? false : boolean = false,
      TList extends "id" extends TName ? false : boolean = false
    >(
      name: TName,
      type: TType,
      modifiers?: { optional?: TOptional; list?: TList }
    ) => addColumn(newTable, name, type, modifiers),
  };
};

export const createTable = <TTableName extends string>(
  name: TTableName
): IT<TTableName, {}> => {
  const table = { name, columns: {} } as const;

  return {
    table,
    addColumn: <
      TName extends string,
      TType extends Scalar,
      TOptional extends "id" extends TName ? false : boolean = false,
      TList extends "id" extends TName ? false : boolean = false
    >(
      name: TName,
      type: TType,
      modifiers?: { optional?: TOptional; list?: TList }
    ): IT<TTableName, Record<TName, Column<TType, TOptional, TList>>> =>
      addColumn(table, name, type, modifiers),
  };
};

/**
 * Used for advanced type checking
 */
export const createSchema = <
  const TSchema extends readonly IT<
    string,
    { id: Column<ID, false, false> } & Record<string, Column>
  >[]
>(
  schema: TSchema
): { [key in keyof TSchema]: TSchema[key]["table"] } => {
  const tables = schema.map((it) => it.table);

  tables.forEach((t) => {
    noSpaces(t.name);

    if (t.columns.id === undefined)
      throw Error('Table doesn\'t contain an "id" field');
    if (
      t.columns.id.type !== "bigint" &&
      t.columns.id.type !== "string" &&
      t.columns.id.type !== "bytes" &&
      t.columns.id.type !== "number"
    )
      throw Error('"id" is not of the correct type');
    // NOTE: This is a to make sure the user didn't override the optional type
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (t.columns.id.optional === true) throw Error('"id" cannot be optional');
    // NOTE: This is a to make sure the user didn't override the list type
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (t.columns.id.list === true) throw Error('"id" cannot be a list');

    Object.keys(t.columns).forEach((key) => {
      if (key === "id") return;

      noSpaces(key);

      if (
        t.columns[key].type !== "bigint" &&
        t.columns[key].type !== "string" &&
        t.columns[key].type !== "bytes" &&
        t.columns[key].type !== "number" &&
        t.columns[key].type !== "bytes"
      )
        throw Error("Column is not a valid type");
    });
  });

  return tables as { [key in keyof TSchema]: TSchema[key]["table"] };
};

const noSpaces = (name: string) => {
  if (name.includes(" ")) throw Error("Table or column name contains a space");
};