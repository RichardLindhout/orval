import isEmpty from 'lodash/isEmpty';
import {
  ComponentsObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
} from 'openapi3-ts';
import { ContextSpecs } from '../../types';
import { GeneratorImport, GeneratorSchema } from '../../types/generator';
import { asyncReduce } from '../../utils/async-reduce';
import { pascal } from '../../utils/case';
import { jsDoc } from '../../utils/doc';
import { getResReqTypes } from '../getters/resReqTypes';

export const generateComponentDefinition = (
  responses:
    | ComponentsObject['responses']
    | ComponentsObject['requestBodies'] = {},
  context: ContextSpecs,
  suffix: string,
): Promise<GeneratorSchema[]> => {
  if (isEmpty(responses)) {
    return Promise.resolve([]);
  }

  return asyncReduce(
    Object.entries(responses),
    async (
      acc,
      [name, response]: [
        string,
        ReferenceObject | RequestBodyObject | ResponseObject,
      ],
    ) => {
      const allResponseTypes = await getResReqTypes(
        [[suffix, response]],
        name,
        context,
        'void',
      );

      const imports = allResponseTypes.reduce<GeneratorImport[]>(
        (acc, { imports = [] }) => [...acc, ...imports],
        [],
      );

      const schemas = allResponseTypes.reduce<GeneratorSchema[]>(
        (acc, { schemas = [] }) => [...acc, ...schemas],
        [],
      );

      const type = allResponseTypes.map(({ value }) => value).join(' | ');

      const modelName = `${pascal(name)}${suffix}`;
      const doc = jsDoc(response as ResponseObject | RequestBodyObject);
      const model = `${doc}export type ${modelName} = ${type || 'unknown'};\n`;

      return [
        ...acc,
        ...schemas,
        ...(modelName !== type
          ? [
              {
                name: modelName,
                model,
                imports,
              },
            ]
          : []),
      ];
    },
    [] as GeneratorSchema[],
  );
};
