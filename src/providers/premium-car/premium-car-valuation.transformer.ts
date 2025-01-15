import { VehicleValuation } from '@app/models';
import { PremiumCarValuationResponse } from '@app/providers';

export class PremiumValuationTransformer {
  static transform(
    response: PremiumCarValuationResponse,
    vrm: string,
  ): VehicleValuation {
    const valuation = new VehicleValuation();

    valuation.vrm = vrm;
    // Using private sale values as they're typically more relevant for consumer valuations
    valuation.lowestValue = parseFloat(
      response.root.ValuationPrivateSaleMinimum,
    );
    valuation.highestValue = parseFloat(
      response.root.ValuationPrivateSaleMaximum,
    );

    return valuation;
  }
}
