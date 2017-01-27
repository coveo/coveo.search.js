import {Component} from '../Base/Component';
import {ComponentOptions} from '../Base/ComponentOptions';
import {IComponentBindings} from '../Base/ComponentBindings';
import {QueryEvents} from '../../events/QueryEvents';
import {Initialization} from '../Base/Initialization';
import {InitializationEvents} from '../../events/InitializationEvents';
import {Assert} from '../../misc/Assert';
import {ResultListEvents, IChangeLayoutEventArgs} from '../../events/ResultListEvents';
import {ResultLayoutEvents, IResultLayoutPopulateArgs} from '../../events/ResultLayoutEvents';
import {$$} from '../../utils/Dom';
import {IQueryErrorEventArgs, IQuerySuccessEventArgs} from '../../events/QueryEvents';
import {QueryStateModel, QUERY_STATE_ATTRIBUTES} from '../../models/QueryStateModel';
import {MODEL_EVENTS, IAttributesChangedEventArg} from '../../models/Model';
import {analyticsActionCauseList, IAnalyticsResultsLayoutChange} from '../Analytics/AnalyticsActionListMeta';
import {IQueryResults} from '../../rest/QueryResults';
import {ResponsiveResultLayout} from '../ResponsiveComponents/ResponsiveResultLayout';
import {Utils} from '../../utils/Utils';

interface IActiveLayouts {
  button: {
    el: HTMLElement;
    visible: boolean;
  }
  enabled: boolean;
}

export interface IResultLayoutOptions {
  mobileLayouts: string[];
  tabletLayouts: string[];
  desktopLayouts: string[];
}

/**
 * The possible valid and supported layout.
 */
export type ValidLayout = 'list' | 'card' | 'table';
export const defaultLayout: ValidLayout = 'list';

/**
 * The ResultLayout component allows the user to switch between multiple {@link ResultList} components with
 * different layouts.
 *
 * It will automatically populate itself with buttons to switch between {@link ResultList} components that have a valid
 * `data-layout` attribute.
 */
export class ResultLayout extends Component {
  static ID = 'ResultLayout';

  /**
   * The possible valid and supported layout.
   */
  public static validLayouts: ValidLayout[] = ['list', 'card', 'table'];
  /**
   * The current active layout.
   */
  public currentLayout: string;

  private currentActiveLayouts: {[key: string]: IActiveLayouts};
  //private buttons: { [key: string]: {el: HTMLElement, visible: boolean}};
  private resultLayoutSection: HTMLElement;

  /**
   * @componentOptions
   */
  static options: IResultLayoutOptions = {
    mobileLayouts: ComponentOptions.buildListOption<ValidLayout>({defaultValue: ['card', 'table']}),
    tabletLayouts: ComponentOptions.buildListOption<ValidLayout>({defaultValue: ['list', 'card', 'table']}),
    desktopLayouts: ComponentOptions.buildListOption<ValidLayout>({defaultValue: ['list', 'card', 'table']})
  };

  /**
   * Creates a new ResultLayout component.
   * @param element The HTMLElement on which the component will be instantiated.
   * @param options The options for the ResultLayout component.
   * @param bindings The bindings that the component requires to function normally. If not set, they will be
   * automatically resolved (with a slower execution time).
   */
  constructor(public element: HTMLElement, public options?: IResultLayoutOptions, bindings?: IComponentBindings) {
    super(element, ResultLayout.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, ResultLayout, options);

    this.currentActiveLayouts = {};

    this.bind.onQueryState(MODEL_EVENTS.CHANGE_ONE, QUERY_STATE_ATTRIBUTES.LAYOUT, this.handleQueryStateChanged.bind(this));
    this.bind.onRootElement(QueryEvents.querySuccess, (args: IQuerySuccessEventArgs) => this.handleQuerySuccess(args));
    this.bind.onRootElement(QueryEvents.queryError, (args: IQueryErrorEventArgs) => this.handleQueryError(args));

    this.resultLayoutSection = $$(this.element).closest('.coveo-result-layout-section');

    this.bind.oneRootElement(InitializationEvents.afterComponentsInitialization, () => this.populate());
    this.bind.oneRootElement(InitializationEvents.afterInitialization, () => this.handleQueryStateChanged());

    ResponsiveResultLayout.init(this.root, this, this.options);
  }

  /**
   * Changes the current layout.
   *
   * Triggers a new query.
   *
   * @param layout The new layout. Possible values are `list`, `card` and `table`.
   * You need a valid {@link ResultList} component with the matching layout configured for this to work correctly end to
   * end.
   */
  public changeLayout(layout: ValidLayout) {
    Assert.check(this.isLayoutDisplayedByButton(layout), 'Layout not available or invalid');

    if (layout !== this.currentLayout || this.getModelValue() === '') {

      this.setModelValue(layout);
      const lastResults = this.queryController.getLastResults();
      this.setLayout(layout, lastResults);
      if (lastResults) {
        this.usageAnalytics.logCustomEvent<IAnalyticsResultsLayoutChange>(analyticsActionCauseList.resultsLayoutChange, {
          resultsLayoutChangeTo: layout
        }, this.element);
      } else {
        this.usageAnalytics.logSearchEvent<IAnalyticsResultsLayoutChange>(analyticsActionCauseList.resultsLayoutChange, {
          resultsLayoutChangeTo: layout
        });
        this.queryController.executeQuery();
      }
    }
  }

  /**
   * Gets the current layout (`list`, `card` or `table`).
   * @returns {string} The current current layout.
   */
  public getCurrentLayout() {
    return this.currentLayout;
  }

  public disableLayouts(layouts: ValidLayout[]) {
    if (Utils.isNonEmptyArray(layouts)) {
      _.each(layouts, (layout)=> {
        this.disableLayout(layout);
      });

      let remainingValidLayouts = _.difference(_.keys(this.currentActiveLayouts), layouts);
      if (remainingValidLayouts && remainingValidLayouts[0]) {
        this.changeLayout(<ValidLayout>remainingValidLayouts[0]);
      } else {
        this.logger.error('Cannot disable the last valid layout ... Re-enabling the first one possible');
        let firstPossibleValidLayout = <ValidLayout>_.keys(this.currentActiveLayouts)[0]
        this.enableLayout(firstPossibleValidLayout);
        this.setLayout(firstPossibleValidLayout);
      }
    }
  }

  public enableLayouts(layouts: ValidLayout[]) {
    _.each(layouts, (layout)=> {
      this.enableLayout(layout);
    });
  }

  private disableLayout(layout: ValidLayout) {
    if (this.isLayoutDisplayedByButton(layout)) {
      this.hideButton(layout);
    }
  }

  private enableLayout(layout: ValidLayout) {
    if (this.isLayoutDisplayedByButton(layout)) {
      this.showButton(layout);
      this.updateSelectorAppearance();
    }
  }


  private hideButton(layout: ValidLayout) {
    if (this.isLayoutDisplayedByButton(layout)) {
      let btn = this.currentActiveLayouts[<string>layout].button;
      $$(btn.el).hide();
      btn.visible = false;
      this.updateSelectorAppearance();
    }
  }

  private showButton(layout: ValidLayout) {
    if (this.isLayoutDisplayedByButton(layout)) {
      let btn = this.currentActiveLayouts[<string>layout].button;
      $$(btn.el).show();
      btn.visible = true;
    }
  }

  private setLayout(layout: ValidLayout, results?: IQueryResults) {
    this.isLayoutDisplayedByButton(layout);
    if (this.currentLayout) {
      $$(this.currentActiveLayouts[this.currentLayout].button.el).removeClass('coveo-selected');
    }
    $$(this.currentActiveLayouts[layout].button.el).addClass('coveo-selected');
    this.currentLayout = layout;
    $$(this.element).trigger(ResultListEvents.changeLayout, <IChangeLayoutEventArgs>{ layout: layout, results: results });
  }

  private handleQuerySuccess(args: IQuerySuccessEventArgs) {
    if (args.results.results.length === 0 || !this.shouldShowSelector()) {
      this.hide();
    } else {
      this.show();
    }
  }

  private handleQueryStateChanged(args?: IAttributesChangedEventArg) {
    const modelLayout = this.getModelValue();
    const newLayout = _.find(_.keys(this.currentActiveLayouts), l => l === modelLayout);
    if (newLayout !== undefined) {
      this.setLayout(<ValidLayout>newLayout);
    } else {
      this.setLayout(<ValidLayout>_.keys(this.currentActiveLayouts)[0]);
    }
  }

  private handleQueryError(args: IQueryErrorEventArgs) {
    this.hide();
  }

  private updateSelectorAppearance() {
    if (this.shouldShowSelector()) {
      this.show();
    } else {
      this.hide();
    }
  }

  private populate() {
    let populateArgs: IResultLayoutPopulateArgs = { layouts: [] };
    $$(this.root).trigger(ResultLayoutEvents.populateResultLayout, populateArgs);
    _.each(populateArgs.layouts, l => Assert.check(_.contains(ResultLayout.validLayouts, l), 'Invalid layout'));
    if (!_.isEmpty(populateArgs.layouts)) {
      _.each(populateArgs.layouts, l => this.addButton(l));
      if (!this.shouldShowSelector()) {
        this.hide();
      }
    }
  }

  private addButton(layout?: string) {
    const btn = $$('span', { className: 'coveo-result-layout-selector' }, layout);
    btn.prepend($$('span', { className: `coveo-icon coveo-sprites-${layout}-layout` }).el);
    if (layout === this.currentLayout) {
      btn.addClass('coveo-selected');
    }
    btn.on('click', () => this.changeLayout(<ValidLayout>layout));
    $$(this.element).append(btn.el);
    this.currentActiveLayouts[layout] = {
      button: {
        visible: true,
        el: btn.el
      },
      enabled: true
    };
  }

  private hide() {
    const elem = this.resultLayoutSection || this.element;
    $$(elem).addClass('coveo-result-layout-hidden');
  }

  private show() {
    const elem = this.resultLayoutSection || this.element;
    $$(elem).removeClass('coveo-result-layout-hidden');
  }

  private getModelValue(): string {
    return this.queryStateModel.get(QueryStateModel.attributesEnum.layout);
  }

  private setModelValue(val: string) {
    this.queryStateModel.set(QueryStateModel.attributesEnum.layout, val);
  }

  private shouldShowSelector() {
    return _.keys(this.currentActiveLayouts).length > 1 && _.filter(this.currentActiveLayouts, (activeLayout: IActiveLayouts)=> activeLayout.button.visible).length > 1;
  }

  private isLayoutDisplayedByButton(layout: ValidLayout) {
    return _.contains(_.keys(this.currentActiveLayouts), layout);
  }
}

Initialization.registerAutoCreateComponent(ResultLayout);
