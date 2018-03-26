import { QueryStateModel } from '../../models/QueryStateModel';
import { Component } from '../Base/Component';
import { BaseComponent } from '../Base/BaseComponent';

type QueryState = { [key: string]: any };
type FacetValueState = { [key: string]: any };
type ComponentsFetcher = (componentId: string) => Component[];

export class FacetValueStateHandler {
  constructor(private componentsFetcher: ComponentsFetcher) {}

  public handleFacetValueState(stateToSet: QueryState): void {
    const facetRef = BaseComponent.getComponentRef('Facet');
    const allFacets: Component[] = facetRef ? this.componentsFetcher(facetRef.ID) : [];
    const fvState = stateToSet.fv;
    const facetValueStateToFacetState = new FacetValueStateToFacetStateTransformer(stateToSet, fvState, allFacets);
    const facetValueStateToHiddenQuery = new FacetValueStateToHiddenQueryTransformer(stateToSet, fvState);

    const allFieldIdsInFacetValueState = Object.keys(fvState);

    const remainingFields = allFieldIdsInFacetValueState
      .filter(field => fvState[field] && fvState[field].length > 0)
      .filter(field => !facetValueStateToFacetState.tryTransform(field, fvState[field]));

    facetValueStateToHiddenQuery.transform(remainingFields);
  }
}

class FacetValueStateToFacetStateTransformer {
  constructor(private queryState: QueryState, private facetValueState: FacetValueState, private allFacets: Component[]) {}

  public tryTransform(fieldId: string, valueInState: string): boolean {
    const facetsWithField = this.allFacets.filter(facet => facet.options.field == fieldId);
    if (facetsWithField.length > 0) {
      delete this.facetValueState[fieldId];
      facetsWithField.forEach(facet => (this.queryState[QueryStateModel.getFacetId(facet.options.id)] = valueInState));
      return true;
    } else {
      return false;
    }
  }
}

class FacetValueStateToHiddenQueryTransformer {
  constructor(private queryState: QueryState, private facetValueState: FacetValueState) {}

  public transform(fieldIds: string[]): void {
    const valuesTransformedToHiddenQuery = fieldIds.map(fieldId => this.facetValueIntoQuery(fieldId));
    if (valuesTransformedToHiddenQuery.length > 0) {
      this.queryState[QueryStateModel.attributesEnum.hq] = valuesTransformedToHiddenQuery.join(' AND ');
    }
  }

  private facetValueIntoQuery(fieldId: string) {
    const value = this.facetValueState[fieldId];
    delete this.facetValueState[fieldId];
    return `${fieldId}=="${value}"`;
  }
}
