import { FacetValueState } from './FacetValueState';
import { FacetSortCriteria } from './FacetSortCriteria';
import { IFacetNumericalRangeValue } from './FacetRangeValues';

export enum FacetType {
  Specific = 'Specific',
  NumericalRange = 'NumericalRange'
}

/**
 * A [`currentValues`]{@link IFacetRequest.currentValues} item in a Search API
 * [facet request]{@link IFacetRequest}.
 */
export interface IFacetRequestValue {
  /**
   * **Required (Search API).** The facet value name.
   */
  value: string | IFacetNumericalRangeValue;

  /**
   * The current facet value state in the search interface.
   *
   * **Default (Search API):** `idle`
   */
  state: FacetValueState;
}

/**
 * A Search API facet request.
 */
export interface IFacetRequest {
  /**
   * The unique identifier of the facet in the search interface.
   *
   * **Note:** Must match `^[A-Za-z0-9-_]{1,60}$`.
   *
   * **Example:** `author-1`
   */
  facetId: string;

  /**
   * **Required (Search API).** The name of the field on which to base the
   * facet request.
   *
   * **Note:** Must reference an index field whose **Facet** option is enabled.
   *
   * **Example:** `author`
   */
  field: string;

  /**
   * The sort criterion to apply to the returned facet values.
   *
   * **Default behavior (Search API):**
   * - When [`isFieldExpanded`]{@link IFacetRequest.isFieldExpanded} is `false`
   * in the facet request, and
   * [`moreValuesAvailable`]{@link IFacetResponse.moreValuesAvailable} is
   * `true` in the corresponding [facet response]{@link IFacetResponse}, use
   * `score`.
   * - Otherwise, use `alphanumeric`.
   */
  sortCriteria?: FacetSortCriteria;

  /**
   * The maximum number of facet values to fetch.
   *
   * **Note:** If
   * [`freezeCurrentValues`]{@link IFacetRequest.freezeCurrentValues} is
   * `true`, `numberOfValues` must be equal to the
   * [`currentValues`]{@link IFacetRequest.currentValues} array length.
   *
   * **Default (Search API):** `8`
   */
  numberOfValues?: number;

  /**
   * The maximum number of items to scan for facet values.
   *
   * **Note:** A high `injectionDepth` may negatively impact the facet request
   * performance.
   *
   * **Default (Search API):** `1000`
   */
  injectionDepth?: number;

  /**
   * Whether to include the facet request's
   * [`currentValues`]{@link IFacetRequest.currentValues} in the corresponding
   * [facet response]{@link IFacetResponse}'s
   * [`values`]{@link IFacetResponse.values} array.
   *
   * **Note:** Setting this to `true` is useful to ensure that the facet does
   * not move around while the end-user is interacting with it in the search
   * interface.
   *
   * **Default (Search API):** `false`
   */
  freezeCurrentValues?: boolean;

  /**
   * The values displayed by the facet in the search interface at the moment of
   * the request.
   *
   * See [IFacetRequestValue]{@link IFacetRequestValue}.
   *
   * **Default (Search API):** `[]`
   */
  currentValues?: IFacetRequestValue[];

  /**
   * Whether the facet is expanded in the search interface at the moment of the
   * request.
   *
   * **Default (Search API):** `false`
   */
  isFieldExpanded?: boolean;
}
