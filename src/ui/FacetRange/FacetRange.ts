/// <reference path='../Facet/Facet.ts' />

import { IFacetOptions, Facet } from '../Facet/Facet';
import { IRangeValue } from '../../rest/RangeValue';
import { ComponentOptions } from '../Base/ComponentOptions';
import { IComponentBindings } from '../Base/ComponentBindings';
import { TemplateHelpers } from '../Templates/TemplateHelpers';
import { IDateToStringOptions } from '../../utils/DateUtils';
import { FacetRangeQueryController } from '../../controllers/FacetRangeQueryController';
import { IGroupByResult } from '../../rest/GroupByResult';
import { Initialization } from '../Base/Initialization';
import * as Globalize from 'globalize';
import { exportGlobally } from '../../GlobalExports';
import { ResponsiveFacetOptions } from '../ResponsiveComponents/ResponsiveFacetOptions';
import { ResponsiveFacets } from '../ResponsiveComponents/ResponsiveFacets';
import { FacetValue } from '../Facet/FacetValue';
import { isUndefined } from 'underscore';

export interface IFacetRangeOptions extends IFacetOptions {
  ranges?: IRangeValue[];
  dateField?: boolean;
  valueFormat?: string;
}
/**
 * A `FacetRange` is a [facet](https://docs.coveo.com/en/198/) whose values are expressed as ranges.
 *
 * You must set the [`field`]{@link Facet.options.field} option to a value targeting a numeric or date [field](https://docs.coveo.com/en/200/) in your index for this component to work.
 *
 * This component extends the [`Facet`]{@link Facet} component and supports all `Facet` options except:
 *
 * - **Settings** menu options
 *   - [`enableSettings`]{@link Facet.options.enableSettings}
 *   - [`enableSettingsFacetState`]{@link Facet.options.enableSettingsFacetState}
 *   - [`enableCollapse`]{@link Facet.options.enableCollapse}
 *   - [`availableSorts`]{@link Facet.options.availableSorts}
 *   - [`customSort`]{@link Facet.options.customSort}
 *   - [`computedFieldCaption`]{@link Facet.options.computedFieldCaption}
 * - **Facet Search** options
 *   - [`enableFacetSearch`]{@link Facet.options.enableFacetSearch}
 *   - [`facetSearchDelay`]{@link Facet.options.facetSearchDelay}
 *   - [`facetSearchIgnoreAccents`]{@link Facet.options.facetSearchIgnoreAccents}
 *   - [`numberOfValuesInFacetSearch`]{@link Facet.options.numberOfValuesInFacetSearch}
 * - **More and Less** options
 *   - [`enableMoreLess`]{@link Facet.options.enableMoreLess}
 *   - [`pageSize`]{@link Facet.options.pageSize}
 *
 *  @notSupportedIn salesforcefree
 */
export class FacetRange extends Facet implements IComponentBindings {
  static ID = 'FacetRange';
  static parent = Facet;

  static doExport = () => {
    exportGlobally({
      FacetRange: FacetRange
    });
  };

  /**
   * The options for the component
   * @componentOptions
   */
  static options: IFacetRangeOptions = {
    /**
     * Whether the specified [`field`]{@link Facet.options.field} option value targets a date field in your index.
     *
     * This allows the component to correctly build the outgoing [Group By](https://docs.coveo.com/en/203/).
     *
     * **Default:** `false`.
     */
    dateField: ComponentOptions.buildBooleanOption({ defaultValue: false }),

    /**
     * The list of [range values]{@link IRangeValue} to request (see [Requesting Specific FacetRange Values](https://docs.coveo.com/en/2790/)).
     *
     * By default, the index automatically generates range values.
     *
     * **Note:**
     * > The index cannot automatically generate range values for a `FacetRange` whose [`field`]{@link Facet.options.field} option value references a dynamic field generated by a [query function](https://docs.coveo.com/en/232/). In such a case, you _must_ use the `ranges` option.
     */
    ranges: ComponentOptions.buildJsonOption<IRangeValue[]>(),

    /**
     * The format to apply to the range values. Only works for numeric values.
     *
     * Some of the most commonly used formats are:
     *
     * - `c0`: format  a numeric value as currency.
     * - `n0`: formats a numeric value as an integer.
     * - `n2`: formats a numeric value as a floating point number with two decimal digits.
     *
     * The available formats are defined in the [Globalize](https://github.com/klaaspieter/jquery-global#numbers) library.
     *
     * **Note:** This option is ignored when the [`valueCaption`]{@link Facet.options.valueCaption} is defined.
     */
    valueFormat: ComponentOptions.buildStringOption({ defaultValue: 'n0' }),
    ...ResponsiveFacetOptions
  };

  public options: IFacetRangeOptions;
  public isFieldValueCompatible = false;

  /**
   * Creates a new `FacetRange`.
   * @param element The HTML element on which to instantiate the component.
   * @param options The configuration options to apply when creating the component.
   * @param bindings The bindings required by the component.
   */
  constructor(public element: HTMLElement, options: IFacetRangeOptions, bindings?: IComponentBindings) {
    super(element, ComponentOptions.initComponentOptions(element, FacetRange, options), bindings, FacetRange.ID);

    this.options.enableFacetSearch = false;
    this.options.enableSettings = false;
    this.options.includeInOmnibox = false;
    this.options.enableMoreLess = false;
    ResponsiveFacets.init(this.root, this, this.options);
  }

  public getValueCaption(facetValue: FacetValue): string {
    const lookupValueIsDefined = !isUndefined(facetValue.lookupValue) && facetValue.lookupValue !== facetValue.value;
    if (this.options.valueCaption || lookupValueIsDefined) {
      return super.getValueCaption(facetValue);
    }

    return this.translateValuesFromFormat(facetValue);
  }

  protected initFacetQueryController() {
    this.facetQueryController = new FacetRangeQueryController(this);
  }

  protected processNewGroupByResults(groupByResults: IGroupByResult) {
    if (groupByResults != null && this.options.ranges == null) {
      groupByResults.values.sort((valueA, valueB) => this.sortRangeGroupByResults(valueA.value, valueB.value));
    }
    super.processNewGroupByResults(groupByResults);
  }

  private sortRangeGroupByResults(valueA: string, valueB: string) {
    const startEndA = this.extractStartAndEndValue(valueA);
    const startEndB = this.extractStartAndEndValue(valueB);
    let firstValue: string;
    let secondValue: string;

    if (!startEndA) {
      firstValue = valueA;
    } else {
      firstValue = startEndA.start;
    }

    if (!startEndB) {
      secondValue = valueB;
    } else {
      secondValue = startEndB.start;
    }

    if (this.options.dateField) {
      return Date.parse(firstValue) - Date.parse(secondValue);
    }
    return Number(firstValue) - Number(secondValue);
  }

  private translateValuesFromFormat(facetValue: FacetValue) {
    const startAndEnd = this.extractStartAndEndValue(facetValue.value);
    if (!startAndEnd) {
      return null;
    }

    return `${this.formatValue(startAndEnd.start)} - ${this.formatValue(startAndEnd.end)}`;
  }

  private extractStartAndEndValue(value: string) {
    const startAndEnd = /^(.*)\.\.(.*)$/.exec(value);

    if (startAndEnd == null) {
      return null;
    }

    return {
      start: startAndEnd[1],
      end: startAndEnd[2]
    };
  }

  private formatValue(value: string) {
    const isNumber = !!value.match(/^[\+\-]?[0-9]+(\.[0-9]+)?$/);
    return this.options.dateField || !isNumber ? this.formatDateValue(value) : this.formatNumberValue(Number(value));
  }

  private formatDateValue(value: string) {
    const helper = TemplateHelpers.getHelper('dateTime');
    const helperOptions: IDateToStringOptions = {
      alwaysIncludeTime: false,
      includeTimeIfThisWeek: false,
      includeTimeIfToday: false,
      omitYearIfCurrentOne: false,
      useTodayYesterdayAndTomorrow: false,
      useWeekdayIfThisWeek: false
    };
    return helper(value, helperOptions);
  }

  private formatNumberValue(value: Number): string {
    return Globalize.format(value, this.options.valueFormat);
  }
}
Initialization.registerAutoCreateComponent(FacetRange);
