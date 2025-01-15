export const valuationParamsSchema = {
  type: 'object',
  properties: {
    vrm: {
      type: 'string',
      maxLength: 7,
      minLength: 1
    }
  },
  required: ['vrm']
} as const;

export const valuationBodySchema = {
  type: 'object',
  properties: {
    mileage: {
      type: 'number',
      minimum: 1
    }
  },
  required: ['mileage']
} as const; 