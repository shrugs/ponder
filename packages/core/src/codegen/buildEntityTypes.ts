/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Kind } from "graphql";

import { Entity, FieldKind } from "@/schema/types";

const gqlScalarToTsType: Record<string, string | undefined> = {
  ID: "string",
  Boolean: "boolean",
  Int: "number",
  String: "string",
  // graph-ts scalar types
  BigInt: "string",
  BigDecimal: "string",
  Bytes: "string",
};

export const buildEntityTypes = (entities: Entity[]) => {
  const entityModelTypes = entities
    .map((entity) => {
      const instanceType = `
        export type ${entity.name}Instance = {
          ${entity.fields
            .map((field) => {
              switch (field.kind) {
                case FieldKind.ID: {
                  return `${field.name}: string;`;
                }
                case FieldKind.ENUM: {
                  return `${field.name}${
                    field.notNull ? "" : "?"
                  }: ${field.enumValues.map((val) => `"${val}"`).join(" | ")};`;
                }
                case FieldKind.SCALAR: {
                  const scalarTsType =
                    gqlScalarToTsType[field.baseGqlType.name];
                  if (!scalarTsType) {
                    throw new Error(
                      `TypeScript type not found for scalar: ${field.baseGqlType.name}`
                    );
                  }

                  return `${field.name}${
                    field.notNull ? "" : "?"
                  }: ${scalarTsType};`;
                }
                case FieldKind.LIST: {
                  // This is trash
                  let tsBaseType: string;
                  if (
                    Object.keys(gqlScalarToTsType).includes(
                      field.baseGqlType.toString()
                    )
                  ) {
                    const scalarTypeName = field.baseGqlType.toString();
                    const scalarTsType = gqlScalarToTsType[scalarTypeName];
                    if (!scalarTsType) {
                      throw new Error(
                        `TypeScript type not found for scalar: ${scalarTypeName}`
                      );
                    }
                    tsBaseType = scalarTsType;
                  } else if (
                    // @ts-ignore
                    field.baseGqlType.astNode?.kind ===
                    Kind.ENUM_TYPE_DEFINITION
                  ) {
                    const enumValues = // @ts-ignore
                      (field.baseGqlType.astNode?.values || []).map(
                        // @ts-ignore
                        (v) => v.name.value
                      );
                    tsBaseType = `(${enumValues
                      // @ts-ignore
                      .map((v) => `"${v}"`)
                      .join(" | ")})`;
                  } else {
                    throw new Error(
                      `Unable to generate type for field: ${field.name}`
                    );
                  }

                  if (!field.isListElementNotNull) {
                    tsBaseType = `(${tsBaseType} | null)`;
                  }

                  return `${field.name}${
                    field.notNull ? "" : "?"
                  }: ${tsBaseType}[];`;
                }
                case FieldKind.RELATIONSHIP: {
                  return `${field.name}: string;`;
                }
              }
            })
            .join("")}
      };`;

      const instanceWithoutIdType =
        entity.fields.length > 1
          ? `Omit<${entity.name}Instance, "id">`
          : `Record<string, never>`;

      const modelType = `
        export type ${entity.name}Model = {
          get: (id: string) => Promise<${entity.name}Instance | null>;
          insert: (id: string, obj: ${instanceWithoutIdType}) => Promise<${entity.name}Instance>;
          update: (id: string, obj: Partial<${instanceWithoutIdType}>) =>
            Promise<${entity.name}Instance>;
          delete: (id: string) => Promise<boolean>;
          upsert: (id: string, obj: ${instanceWithoutIdType}) => Promise<${entity.name}Instance>;
        };
      `;

      return instanceType + modelType;
    })
    .join("");

  return entityModelTypes;
};
