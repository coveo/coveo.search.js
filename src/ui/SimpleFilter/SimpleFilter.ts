import { Component } from '../Base/Component';
import { IComponentBindings } from '../Base/ComponentBindings';
import { Initialization } from '../Base/Initialization';
import { exportGlobally } from '../../GlobalExports';
import 'styling/_SimpleFilter';
import { $$, Dom } from '../../utils/Dom';
import { IBuildingQueryEventArgs, IDoneBuildingQueryEventArgs, IQuerySuccessEventArgs, QueryEvents } from '../../events/QueryEvents';
import { ComponentOptions, IFieldOption } from '../Base/ComponentOptions';
import { l } from '../../strings/Strings';
import { Assert } from '../../misc/Assert';
import * as _ from 'underscore';
import { Checkbox } from '../FormWidgets/Checkbox';
import { IGroupByRequest } from '../../rest/GroupByRequest';
import { Utils } from '../../utils/Utils';
import { BreadcrumbEvents, IPopulateBreadcrumbEventArgs } from '../../events/BreadcrumbEvents';
import { SVGIcons } from '../../utils/SVGIcons';
import { SVGDom } from '../../utils/SVGDom';
import { SimpleFilterValues } from './SimpleFilterValues';
import { FacetUtils } from '../Facet/FacetUtils';


export interface ISimpleFilterOptions {
  title: string;
  values: string[];
  field: IFieldOption;
  valueCaption: any;
  maximumNumberOfValues: number;

}

interface ILabeledCheckbox {
  checkbox: Checkbox;
  label: string;
}

/**
 * The `SimpleFilter` component displays a dropdown menu containing values used to filter the results returned by queries.
 *
 * The list of values is either static (defined by the user through the [ `values` ]{@link ISimpleFilterOptions.values} option
 * or dynamic (obtained automatically using a [ `GroupByRequest` ]{@link IGroupByRequest} operation performed at the same time as the main query).
 */
export class SimpleFilter extends Component {
  static ID = 'SimpleFilter';
  static doExport = () => {
    exportGlobally({
      'SimpleFilter': SimpleFilter
    });
  }
  /**
   * The possible options for the SimpleFilter.
   * @componentOptions
   */
  static options: ISimpleFilterOptions = {

    /**
     * Specifies the macimum number of field values to display by default in the SimpleFilter. Default value is 5.
     */
    maximumNumberOfValues: ComponentOptions.buildNumberOption({ defaultValue: 5 }),

    /**
     * Specifies the values to use as filters as a static list.
     *
     * If this option is left undefined, a dynamic list generated by the [ `GroupByRequest` ]{@link IGroupByRequest} which
     * returns [ `GroupByResults` ]{@link IGroupByResult.values}.
     *
     */
    values: ComponentOptions.buildListOption<string>(),

    /**
     * Specifies the index field whose values the `SimpleFilter` should use.
     *
     * Specifying a value for this option is required for the `SimpleFilter` component to work.
     */
    field: ComponentOptions.buildFieldOption({ required: true }),

    /**
     * Specifies the title to display for the SimpleFilter.
     *
     * Default value is the localized `string` for 'NoTitle'.
     */
    title: ComponentOptions.buildStringOption({ defaultValue: l('NoTitle') }),

    /**
     * Specifies a JSON object describing a mapping of SimpleFilter values to their desired captions.
     * **Examples:**
     *
     * You can set the option in the ['init']{@link init} call:
     * ```javascript
     * var myValueCaptions = {
     *   "txt" : "Text files",
     *   "html" : "Web page",
     *   [ ... ]
     * };
     *
     * Coveo.init(document.querySelector("#search"), {
     *   SimpleFilter : {
     *     valueCaption : myValueCaptions
     *   }
     * });
     * ```
     *
     * Or before the `init` call, using the ['options']{@link options} top-level function:
     * ```javascript
     * Coveo.options(document.querySelector("#search"), {
     *   SimpleFilter : {
     *     valueCaption : myValueCaptions
     *   }
     * });
     * ```
     *
     * Or directly in the markup:
     * ```html
     * <!-- Ensure that the double quotes are properly handled in data-value-caption. -->
     * <div class='CoveoSimpleFilter' data-field='@myotherfield' data-value-caption='{"txt":"Text files","html":"Web page"}'></div>
     * ```
     */
    valueCaption: ComponentOptions.buildJsonOption()
  };

  private checkboxContainer: Dom;
  private checkboxes: ILabeledCheckbox[];
  private previouslySelected: string[] = [];
  private circleElement: Dom;
  private backdrop: Dom;
  private selectTitle: Dom;
  private groupByRequestValues: string[] = [];
  private isSticky: boolean = false;
  private groupByBuilder: SimpleFilterValues;

  /**
   * Creates a new `SimpleFilter` component. Binds multiple query events as well.
   * @param element the HTMLElement on which to instantiate the component.
   * @param options The options for the `SimpleFilter` component.
   * @param bindings The bindings that the component requires to function normally.
   */
  constructor(public element: HTMLElement, public options: ISimpleFilterOptions, public bindings?: IComponentBindings) {
    super(element, SimpleFilter.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, SimpleFilter, options);
    this.element.title = this.options.title;
    this.buildContent();
    $$(this.element).on('click', (e: Event) => this.handleClick(e));
    this.bind.onRootElement(BreadcrumbEvents.populateBreadcrumb, (args: IPopulateBreadcrumbEventArgs) => this.handlePopulateBreadcrumb(args));
    this.bind.onRootElement(BreadcrumbEvents.clearBreadcrumb, () => this.handleClearBreadcrumb());
    this.bind.onRootElement(QueryEvents.buildingQuery, (args: IBuildingQueryEventArgs) => this.handleBuildingQuery(args));
    this.bind.onRootElement(QueryEvents.doneBuildingQuery, (args: IDoneBuildingQueryEventArgs) => this.handleDoneBuildingQuery(args));
    this.bind.onRootElement(QueryEvents.querySuccess, (args: IQuerySuccessEventArgs) => this.handleGroupBy(args));
  }

  /**
   * Gets the `SimpleFilter`'s CheckboxContainer
   * @returns {Dom} The `SimpleFilter`'s CheckboxContainer
   */
  public getCheckboxContainer(): Dom {
    return this.checkboxContainer;
  }

  /**
   * Checks if the value has a corresponding caption. If so, return the caption, else return the value as is.
   * @param value The value to test.
   * @returns {any} The original value or the caption.
   */
  public getValueCaption(value: string): string {
    let ret = value;

    if (_.contains(this.options.valueCaption, value)) {
      ret = this.options.valueCaption[ret] || ret;
      return l(ret);
    } else {
      return FacetUtils.tryToGetTranslatedCaption(this.options.field.toString(), ret);
    }
  }

  /**
   * @returns {string[]} An array containing the selected captions.
   */
  public getSelectedCaptions(): string[] {
    return _.map(this.getSelectedValues(), (selectedValue: string) => this.getValueCaption(selectedValue));
  }

  /**
   * Toggles the `SimpleFilter` container between its opened and closed state.
   */
  public toggleContainer() {
    $$(this.checkboxContainer).hasClass('coveo-simplefilter-checkbox-container-expanded') ? this.closeContainer() : this.openContainer();
  }

  /**
   * Selects The checkbox with the matching value and triggers a query by default.
   * @param value The value to select if a match is found.
   * @param triggerQuery `true` by default. If set to `false`, no query will be executed.
   */
  public selectValue(value: string, triggerQuery = true) {
    _.each(this.checkboxes, (labeledCheckbox: ILabeledCheckbox) => {
      if (labeledCheckbox.label == value) {
        labeledCheckbox.checkbox.select(triggerQuery);
      }
    });
  }

  /**
   * Resets The checkbox with the matching value.
   * @param value The value to reset if a match is found.
   */
  public deselectValue(value: string) {
    _.each(this.checkboxes, (labeledCheckbox: ILabeledCheckbox) => {
      if (labeledCheckbox.label == value) {
        labeledCheckbox.checkbox.reset();
      }
    });
  }

  /**
   * Toggles the checkbox with the matching value.
   * @param value The value to toggle if a match is found.
   */
  public toggleValue(value: string) {
    _.each(this.checkboxes, (labeledCheckbox: ILabeledCheckbox) => {
      if (labeledCheckbox.label == value) {
        labeledCheckbox.checkbox.toggle();
      }
    });
  }

  /**
   * Resets the component to it's original state.
   */
  public resetSimpleFilter() {
    _.each(this.checkboxes, (labeledCheckbox: ILabeledCheckbox) => {
      if (labeledCheckbox.checkbox.isSelected()) {
        this.deselectValue(labeledCheckbox.label);
      }
    });
  }

  /**
   * Opens the `SimpleFilter's` [ `CheckboxContainer` ]{@link SimpleFilter.checkboxContainer}.
   */
  public openContainer() {
    $$(this.element).addClass('coveo-simplefilter-checkbox-container-expanded');
    this.checkboxContainer.addClass('coveo-simplefilter-checkbox-container-expanded');
    this.refreshCheckboxContainer();
    this.isSticky = true;
    if (!this.backdrop.hasClass('coveo-dropdown-background-active')) {
      this.showBackdrop();
    }
  }

  /**
   * Closes the `SimpleFilter's` [ `CheckboxContainer` ]{@link SimpleFilter.checkboxContainer}.
   */
  public closeContainer() {
    $$(this.element).removeClass('coveo-simplefilter-checkbox-container-expanded');
    this.checkboxContainer.removeClass('coveo-simplefilter-checkbox-container-expanded');
    if (this.backdrop.hasClass('coveo-dropdown-background-active')) {
      this.hideBackdrop();
    }
    if (this.getSelectedLabeledCheckboxes().length == 0) {
      this.isSticky = false;
    }
  }

  private getSelectedValues() {
    return _.map(this.getSelectedLabeledCheckboxes(), (labeledCheckbox: ILabeledCheckbox) => labeledCheckbox.label);
  }

  private handleClick(e: Event) {

    if (e.target == this.element) {
      this.toggleContainer();
    }
  }

  private handleCheckboxToggle() {
    const selectedValues = this.getSelectedValues();
    this.circleElement.text(selectedValues.length.toString());
    if (selectedValues.length == 1) {
      this.setDisplayedTitle(this.getValueCaption(selectedValues[0]));
    } else {
      this.setDisplayedTitle(this.options.title);
    }
    this.queryController.executeQuery();
  }

  private createCheckbox(label: string) {

    const checkbox = new Checkbox(() => {
      this.handleCheckboxToggle();
    }, this.getValueCaption(label));

    return { checkbox, label };
  }

  private createCheckboxes() {

    if (this.previouslySelected.length > 0) {
      this.checkboxes = _.map(this.previouslySelected, (caption) => this.createCheckbox(caption));
      _.each(this.checkboxes, (checkbox) => {
        if (this.previouslySelected.indexOf(checkbox.label) >= 0) {
          this.selectValue(checkbox.label, false);
        }
      });
    } else if (this.options.values != undefined) {
      this.checkboxes = _.map(this.options.values, (caption) => this.createCheckbox(caption));
    } else if (this.groupByRequestValues != undefined) {
      this.checkboxes = _.map(this.groupByRequestValues, (caption) => this.createCheckbox(caption));
    }
    _.each(this.checkboxes, (result) => {
      this.checkboxContainer.append(result.checkbox.getElement());
    });
  }

  private createCheckboxContainer() {
    this.checkboxContainer = $$('div', { className: 'coveo-simplefilter-checkbox-container' });
  }

  private buildContent() {
    this.createCheckboxContainer();
    this.element.appendChild(this.buildSelect());
    this.element.appendChild(this.checkboxContainer.el);
    this.findOrCreateWrapper().append(this.element);
    this.createBackdrop();
  }

  private buildSelect(): HTMLElement {
    const select = $$('span', { className: 'coveo-simplefilter-select' });
    this.selectTitle = $$('span', { className: 'coveo-simplefilter-selecttext' }, this.getValueCaption(this.options.title));
    select.append(this.selectTitle.el);
    select.append(this.buildCircleElement());
    select.append(this.buildSvgToggleUpIcon());
    return select.el;
  }

  private buildSvgToggleUpIcon(): HTMLElement {
    let svgIcon = $$('span', null, SVGIcons.arrowDown).el;
    SVGDom.addClassToSVGInContainer(svgIcon, 'coveo-simplefilter-toggle-down-svg');
    return svgIcon;
  }

  private buildCircleElement(): HTMLElement {
    this.circleElement = $$('span', { className: 'coveo-simplefilter-circle' }, this.getSelectedLabeledCheckboxes().length.toString());
    return this.circleElement.el;
  }

  private createBackdrop() {
    const backdrop = $$(this.root).find('.coveo-dropdown-background');

    if (backdrop == null) {
      this.backdrop = $$('div', { className: 'coveo-dropdown-background' });
      this.root.appendChild(this.backdrop.el);
    } else {
      this.backdrop = $$(backdrop);
    }
    this.backdrop.on('click', () => this.closeContainer());
  }

  private handlePopulateBreadcrumb(args: IPopulateBreadcrumbEventArgs) {

    if (this.getSelectedLabeledCheckboxes().length > 0) {
      const elem = $$('div', { className: 'coveo-simplefilter-breadcrumb' });
      const title = $$('span', { className: 'coveo-simplefilter-breadcrumb-title' }, this.options.title);
      elem.append(title.el);
      const values = $$('span', { className: 'coveo-simplefilter-breadcrumb-values' });
      elem.append(values.el);

      _.each(this.getSelectedLabeledCheckboxes(), (selectedlabeledCheckbox) => {
        const value = $$('span', { className: 'coveo-simplefilter-breadcrumb-value' }, this.getValueCaption(selectedlabeledCheckbox.label));
        values.append(value.el);
        const svgContainer = $$('span', { className: 'coveo-simplefilter-breadcrumb-clear' }, SVGIcons.checkboxHookExclusionMore);
        SVGDom.addClassToSVGInContainer(svgContainer.el, 'coveo-simplefilter-breadcrumb-clear-svg');
        value.append(svgContainer.el);
        value.el.title = this.getValueCaption(selectedlabeledCheckbox.label);
        $$(value).on('click', () => this.handleRemoveFromBreadcrumb(selectedlabeledCheckbox));
      });

      args.breadcrumbs.push({
        element: elem.el
      });
    }
  }

  private handleRemoveFromBreadcrumb(labeledCheckbox: ILabeledCheckbox) {
    labeledCheckbox.checkbox.reset();
    this.refreshCheckboxContainer();
  }

  private handleClearBreadcrumb() {
    this.resetSimpleFilter();
  }

  private handleGroupBy(data: IQuerySuccessEventArgs) {

    if (this.options.values == undefined) {
      this.groupByBuilder.groupBy(data);
      this.groupByRequestValues = this.groupByBuilder.getValuesFromGroupBy();
      this.refreshCheckboxContainer();
      if (!$$(this.element).hasClass('coveo-simplefilter-checkbox-container-expanded')) {
        this.isSticky = false;
      }
    }
  }

  private handleBuildingQuery(args: IBuildingQueryEventArgs) {
    Assert.exists(args);
    Assert.exists(args.queryBuilder);
    const selectedValues = this.getSelectedValues();

    if (selectedValues.length > 0) {
      args.queryBuilder.advancedExpression.addFieldExpression(this.options.field.toString(), '==', selectedValues);
    }
  }

  private handleDoneBuildingQuery(data: IDoneBuildingQueryEventArgs) {

    if (this.options.values == undefined) {
      Assert.exists(data);
      Assert.exists(data.queryBuilder);
      this.previouslySelected = this.getSelectedValues();
      this.groupByBuilder = new SimpleFilterValues(this, this.options);
      this.groupByBuilder.handleDoneBuildingQuery(data);
    }
  }

  private getSelectedLabeledCheckboxes(): ILabeledCheckbox[] {
    return _.filter(this.checkboxes, (labeledCheckbox: ILabeledCheckbox) => labeledCheckbox.checkbox.isSelected());
  }

  private setDisplayedTitle(title: string) {
    this.selectTitle.text(this.getValueCaption(title));
  }

  private getDisplayedTitle(): string {
    return this.selectTitle.text();
  }

  private showBackdrop() {
    this.backdrop.addClass('coveo-dropdown-background-active');
  }

  private hideBackdrop() {
    this.backdrop.removeClass('coveo-dropdown-background-active');
  }

  private getBackdrop(): Dom {
    return this.backdrop;
  }

  private findOrCreateWrapper() {

    if ($$(this.root).find('.coveo-simplefilter-header-wrapper') == null) {
      const wrapper = $$('div', { className: 'coveo-simplefilter-header-wrapper' });
      wrapper.insertBefore(this.element);
      return wrapper;
    } else {
      const wrapper = $$(this.root).find('.coveo-simplefilter-header-wrapper');
      return $$(wrapper);
    }
  }

  private refreshCheckboxContainer() {

    if (!this.isSticky) {
      this.checkboxContainer.empty();
      this.createCheckboxes();
    }

    if (this.checkboxes.length == 0 && !this.isSticky) {
      $$(this.element).addClass('coveo-simplefilter-empty');
    } else {
      $$(this.element).removeClass('coveo-simplefilter-empty');
    }
    $$(this.circleElement).text(this.getSelectedLabeledCheckboxes().length.toString());
  }

}

Initialization.registerAutoCreateComponent(SimpleFilter);
