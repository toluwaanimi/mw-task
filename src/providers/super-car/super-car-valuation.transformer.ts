import { VehicleValuation } from '@app/models';
import { SuperCarValuationResponse } from '@app/providers';

export class SuperCarValuationTransformer {
  static transform(
    response: SuperCarValuationResponse,
    vrm: string,
  ): VehicleValuation {
    const valuation = new VehicleValuation();

    valuation.vrm = vrm;
    valuation.lowestValue = response.valuation.lowerValue;
    valuation.highestValue = response.valuation.upperValue;

    return valuation;
  }
}
