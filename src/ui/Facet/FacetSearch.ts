/// <reference path="Facet.ts" />

import { IIndexFieldValue } from '../../rest/FieldValue';
import { Facet } from './Facet';
import { $$, Dom } from '../../utils/Dom';
import { Utils } from '../../utils/Utils';
import { InitializationEvents } from '../../events/InitializationEvents';
import { FacetSearchParameters } from './FacetSearchParameters';
import { IAnalyticsFacetMeta, analyticsActionCauseList } from '../Analytics/AnalyticsActionListMeta';
import { IEndpointError } from '../../rest/EndpointError';
import { l } from '../../strings/Strings';
import { Assert } from '../../misc/Assert';
import { KEYBOARD } from '../../utils/KeyboardUtils';
import { FacetValue } from './FacetValues';
import { StringUtils } from '../../utils/StringUtils';
import { IFacetSearchValuesListKlass } from './FacetSearchValuesList';
import { FacetValueElement } from './FacetValueElement';
import { ModalBox } from '../../ExternalModulesShim';
import { SearchInterface } from '../SearchInterface/SearchInterface';
import { ResponsiveComponentsUtils } from '../ResponsiveComponents/ResponsiveComponentsUtils';
import { FacetValuesOrder } from './FacetValuesOrder';
import * as _ from 'underscore';
import 'styling/_FacetSearch';
import { FacetSearchElement } from './FacetSearchElement';

/**
 * Used by the {@link Facet} component to render and handle the facet search part of each facet.
 */
export class FacetSearch {
  public currentlyDisplayedResults: string[];

  private facetSearchTimeout: number;
  private facetSearchPromise: Promise<IIndexFieldValue[]>;
  private moreValuesToFetch = true;
  private onResize: (...args: any[]) => void;
  private onDocumentClick: (e: Event) => void;
  private lastSearchWasEmpty = true;
  private facetSearchElement: FacetSearchElement;

  constructor(public facet: Facet, public facetSearchValuesListKlass: IFacetSearchValuesListKlass, private root: HTMLElement) {
    this.facetSearchElement = new FacetSearchElement();
    this.onResize = _.debounce(() => {
      // Mitigate issues in UT where the window in phantom js might get resized in the scope of another test.
      // These would point to random instance of a test karma object, and not a real search interface.
      if (this.facet instanceof Facet && this.facet.searchInterface instanceof SearchInterface) {
        if (this.shouldPositionSearchResults()) {
          this.positionSearchResults();
        }
      }
    }, 250);
    this.onDocumentClick = (e: Event) => {
      this.handleClickElsewhere(e);
    };
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('click', (e: Event) => this.onDocumentClick(e));
    $$(facet.root).on(InitializationEvents.nuke, () => this.handleNuke());
  }

  /**
   * Build the search component and return an `HTMLElement` which can be appended to the {@link Facet}.
   * @returns {HTMLElement}
   */
  public build(): HTMLElement {
    return this.buildBaseSearch();
  }

  /**
   * Position the search results at the footer of the facet.
   */
  public positionSearchResults(nextTo: HTMLElement = this.search) {
    this.facetSearchElement.positionSearchResults(this.root, this.facet.element.clientWidth, nextTo);
  }

  /**
   * Dismiss the search results
   */
  public completelyDismissSearch() {
    this.cancelAnyPendingSearchOperation();
    this.facet.unfadeInactiveValuesInMainList();
    $$(this.searchResults).empty();
    this.moreValuesToFetch = true;
    $$(this.search).removeClass('coveo-facet-search-no-results');
    $$(this.facet.element).removeClass('coveo-facet-searching');
    this.facetSearchElement.hideSearchResultsElement();
    this.input.value = '';
    $$(this.clear).hide();
    this.currentlyDisplayedResults = undefined;
  }

  /**
   * Trigger a new facet search, and display the results.
   * @param params
   */
  public triggerNewFacetSearch(params: FacetSearchParameters) {
    this.cancelAnyPendingSearchOperation();
    this.facetSearchElement.showFacetSearchWaitingAnimation();

    this.facet.logger.info('Triggering new facet search');

    this.facetSearchPromise = this.facet.facetQueryController.search(params);

    if (this.facetSearchPromise) {
      this.facetSearchPromise
        .then((fieldValues: IIndexFieldValue[]) => {
          this.facet.usageAnalytics.logCustomEvent<IAnalyticsFacetMeta>(
            analyticsActionCauseList.facetSearch,
            {
              facetId: this.facet.options.id,
              facetTitle: this.facet.options.title
            },
            this.facet.root
          );
          this.facet.logger.debug('Received field values', fieldValues);
          this.processNewFacetSearchResults(fieldValues, params);
          this.facetSearchElement.hideFacetSearchWaitingAnimation();
          this.facetSearchPromise = undefined;
        })
        .catch((error: IEndpointError) => {
          // The request might be normally cancelled if another search is triggered.
          // In this case we do not hide the animation to prevent flicking.
          if (Utils.exists(error)) {
            this.facet.logger.error('Error while retrieving facet values', error);
            this.facetSearchElement.hideFacetSearchWaitingAnimation();
          }
          this.facetSearchPromise = undefined;
          return null;
        });
    }
  }

  /**
   * Trigger the event associated with the focus of the search input.
   */
  public focus(): void {
    this.input.focus();
    this.handleFacetSearchFocus();
  }

  public get searchResults() {
    return this.facetSearchElement.searchResults;
  }

  public get searchBarIsAnimating() {
    return this.facetSearchElement.searchBarIsAnimating;
  }

  public get search() {
    return this.facetSearchElement.search;
  }

  private get input() {
    return this.facetSearchElement.input;
  }

  private get clear() {
    return this.facetSearchElement.clear;
  }

  private shouldPositionSearchResults(): boolean {
    return !ResponsiveComponentsUtils.isSmallFacetActivated($$(this.root)) && $$(this.facet.element).hasClass('coveo-facet-searching');
  }

  private buildBaseSearch(): HTMLElement {
    this.facetSearchElement.build(
      e => this.handleFacetSearchKeyUp(e),
      () => this.handleFacetSearchClear(),
      () => {
        this.handleFacetSearchFocus();
      }
    );
    return this.search;
  }

  private handleFacetSearchKeyUp(event: KeyboardEvent) {
    Assert.exists(event);
    let isEmpty = this.input.value.trim() == '';
    this.showOrHideClearElement(isEmpty);
    this.handleKeyboardNavigation(event, isEmpty);
  }

  private handleNuke() {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('click', this.onDocumentClick);
  }

  private handleFacetSearchFocus() {
    // Trigger a query only if the results are not already rendered.
    // Protect against the case where user can "focus" out of the search box by clicking not directly on a search results
    // Then re-focusing the search box
    if (this.currentlyDisplayedResults == null) {
      this.startNewSearchTimeout(this.buildParamsForExcludingCurrentlyDisplayedValues());
    }
  }

  private handleClickElsewhere(event: Event) {
    if (this.currentlyDisplayedResults && this.search != event.target && this.searchResults != event.target && this.input != event.target) {
      this.completelyDismissSearch();
    }
  }

  private handleFacetSearchClear() {
    this.input.value = '';
    $$(this.clear).hide();
    this.completelyDismissSearch();
  }

  private showOrHideClearElement(isEmpty: boolean) {
    if (!isEmpty) {
      $$(this.clear).show();
    } else {
      $$(this.clear).hide();
      $$(this.search).removeClass('coveo-facet-search-no-results');
    }
  }

  private handleKeyboardNavigation(event: KeyboardEvent, isEmpty: boolean) {
    switch (event.which) {
      case KEYBOARD.ENTER:
        this.keyboardNavigationEnterPressed(event, isEmpty);
        break;
      case KEYBOARD.DELETE:
        this.keyboardNavigationDeletePressed(event);
        break;
      case KEYBOARD.ESCAPE:
        this.completelyDismissSearch();
        break;
      case KEYBOARD.DOWN_ARROW:
        this.moveCurrentResultDown();
        break;
      case KEYBOARD.UP_ARROW:
        this.moveCurrentResultUp();
        break;
      default:
        this.moreValuesToFetch = true;
        this.highlightCurrentQueryWithinSearchResults();
        if (!isEmpty) {
          this.lastSearchWasEmpty = false;
          this.startNewSearchTimeout(this.buildParamsForNormalSearch());
        } else if (!this.lastSearchWasEmpty) {
          // This normally happen if a user delete the search box content to go back to "empty" state.
          this.currentlyDisplayedResults = undefined;
          $$(this.searchResults).empty();
          this.lastSearchWasEmpty = true;
          this.startNewSearchTimeout(this.buildParamsForFetchingMore());
        }

        break;
    }
  }

  private keyboardNavigationEnterPressed(event: KeyboardEvent, isEmpty: boolean) {
    if (event.shiftKey) {
      this.triggerNewFacetSearch(this.buildParamsForNormalSearch());
    } else {
      if (this.searchResults.style.display != 'none') {
        this.performSelectActionOnCurrentSearchResult();
        this.completelyDismissSearch();
      } else if ($$(this.search).is('.coveo-facet-search-no-results') && !isEmpty) {
        this.selectAllValuesMatchingSearch();
      }
    }
  }
  private keyboardNavigationDeletePressed(event: KeyboardEvent) {
    if (event.shiftKey) {
      this.performExcludeActionOnCurrentSearchResult();
      this.completelyDismissSearch();
      this.input.value = '';
    }
  }

  private startNewSearchTimeout(params: FacetSearchParameters) {
    this.cancelAnyPendingSearchOperation();
    this.facetSearchTimeout = window.setTimeout(() => {
      this.triggerNewFacetSearch(params);
    }, this.facet.options.facetSearchDelay);
  }

  private cancelAnyPendingSearchOperation() {
    if (Utils.exists(this.facetSearchTimeout)) {
      clearTimeout(this.facetSearchTimeout);
      this.facetSearchTimeout = undefined;
    }
    if (Utils.exists(this.facetSearchPromise)) {
      Promise.reject(this.facetSearchPromise).catch(() => {});
      this.facetSearchPromise = undefined;
    }

    this.facetSearchElement.hideFacetSearchWaitingAnimation();
  }

  private processNewFacetSearchResults(fieldValues: IIndexFieldValue[], facetSearchParameters: FacetSearchParameters) {
    Assert.exists(fieldValues);
    fieldValues = new FacetValuesOrder(this.facet, this.facet.facetSort).reorderValues(fieldValues);
    if (fieldValues.length > 0) {
      $$(this.search).removeClass('coveo-facet-search-no-results');
      this.facet.fadeInactiveValuesInMainList(this.facet.options.facetSearchDelay);
      this.rebuildSearchResults(fieldValues, facetSearchParameters);
      if (!facetSearchParameters.fetchMore) {
        this.showSearchResultsElement();
      }
      this.highlightCurrentQueryWithinSearchResults();
      this.makeFirstSearchResultTheCurrentOne();
    } else {
      if (facetSearchParameters.fetchMore) {
        this.moreValuesToFetch = false;
      } else {
        this.facetSearchElement.hideSearchResultsElement();
        $$(this.search).addClass('coveo-facet-search-no-results');
      }
    }
  }

  private rebuildSearchResults(fieldValues: IIndexFieldValue[], facetSearchParameters: FacetSearchParameters) {
    Assert.exists(fieldValues);
    if (!facetSearchParameters.fetchMore) {
      $$(this.searchResults).empty();
    }
    let selectAll = document.createElement('li');
    if (Utils.isNonEmptyString(facetSearchParameters.valueToSearch)) {
      $$(selectAll).addClass(['coveo-facet-selectable', 'coveo-facet-search-selectable', 'coveo-facet-search-select-all']);
      $$(selectAll).text(l('SelectAll'));
      $$(selectAll).on('click', () => this.selectAllValuesMatchingSearch());
      this.searchResults.appendChild(selectAll);
    }
    let facetValues = _.map(fieldValues, fieldValue => {
      return FacetValue.create(fieldValue);
    });
    _.each(new this.facetSearchValuesListKlass(this.facet, FacetValueElement).build(facetValues), (listElement: HTMLElement) => {
      this.searchResults.appendChild(listElement);
    });
    if (this.currentlyDisplayedResults) {
      this.currentlyDisplayedResults = this.currentlyDisplayedResults.concat(_.pluck(facetValues, 'value'));
    } else {
      this.currentlyDisplayedResults = _.pluck(facetValues, 'value');
    }

    _.each($$(this.searchResults).findAll('.coveo-facet-selectable'), (elem: HTMLElement) => {
      $$(elem).addClass('coveo-facet-search-selectable');
      this.setupFacetSearchResultsEvents(elem);
    });
    $$(this.searchResults).on('scroll', () => this.handleFacetSearchResultsScroll());
  }

  private setupFacetSearchResultsEvents(elem: HTMLElement) {
    $$(elem).on('mousemove', () => {
      this.makeCurrentResult(elem);
    });

    // Prevent closing the search results on the end of a touch drag
    let touchDragging = false;
    let mouseDragging = false;
    $$(elem).on('mousedown', () => (mouseDragging = false));
    $$(elem).on('mousemove', () => (mouseDragging = true));
    $$(elem).on('touchmove', () => (touchDragging = true));

    $$(elem).on('mouseup touchend', () => {
      if (!touchDragging && !mouseDragging) {
        setTimeout(() => {
          this.completelyDismissSearch();
        }, 0); // setTimeout is to give time to trigger the click event before hiding the search menu.
      }
      touchDragging = false;
      mouseDragging = false;
    });
  }

  private handleFacetSearchResultsScroll() {
    if (this.facetSearchPromise || this.getValueInInputForFacetSearch() != '' || !this.moreValuesToFetch) {
      return;
    }

    let elementHeight = this.searchResults.clientHeight;
    let scrollHeight = this.searchResults.scrollHeight;
    let bottomPosition = this.searchResults.scrollTop + elementHeight;
    if (scrollHeight - bottomPosition < elementHeight / 2) {
      this.triggerNewFacetSearch(this.buildParamsForFetchingMore());
    }
  }

  private buildParamsForNormalSearch() {
    let params = new FacetSearchParameters(this.facet);
    params.setValueToSearch(this.getValueInInputForFacetSearch());
    params.fetchMore = false;
    return params;
  }

  private buildParamsForFetchingMore() {
    let params = this.buildParamsForExcludingCurrentlyDisplayedValues();
    params.fetchMore = true;
    return params;
  }

  protected buildParamsForExcludingCurrentlyDisplayedValues() {
    let params = new FacetSearchParameters(this.facet);
    params.excludeCurrentlyDisplayedValuesInSearch(this.searchResults);
    params.setValueToSearch(this.getValueInInputForFacetSearch());
    return params;
  }

  private showSearchResultsElement() {
    this.positionSearchResults();
  }

  private highlightCurrentQueryWithinSearchResults() {
    let captions = $$(this.searchResults).findAll('.coveo-facet-value-caption');
    _.each(captions, (captionElement: HTMLElement) => {
      let search = this.getValueInInputForFacetSearch();
      let regex = new RegExp('(' + StringUtils.wildcardsToRegex(search, this.facet.options.facetSearchIgnoreAccents) + ')', 'ig');

      let text = $$(captionElement).text();
      let highlighted = text.replace(regex, '<span class="coveo-highlight">$1</span>');
      captionElement.innerHTML = highlighted;
    });
  }

  private makeFirstSearchResultTheCurrentOne() {
    this.makeCurrentResult(this.getSelectables()[0]);
  }

  private makeCurrentResult(result: HTMLElement) {
    _.each(this.getSelectables(), (selectable: HTMLElement) => {
      $$(selectable).removeClass('coveo-current');
    });
    $$(result).addClass('coveo-current');
  }

  private moveCurrentResultDown() {
    let current = $$(this.searchResults).find('.coveo-current');
    _.each(this.getSelectables(), (selectable: HTMLElement) => {
      $$(selectable).removeClass('coveo-current');
    });
    let allSelectables = this.getSelectables();
    let idx = _.indexOf(allSelectables, current);
    let target: Dom;
    if (idx < allSelectables.length - 1) {
      target = $$(allSelectables[idx + 1]);
    } else {
      target = $$(allSelectables[0]);
    }
    this.highlightAndShowCurrentResultWithKeyboard(target);
  }

  private moveCurrentResultUp() {
    let current = $$(this.searchResults).find('.coveo-current');
    _.each($$(this.searchResults).findAll('.coveo-facet-selectable'), s => {
      $$(s).removeClass('coveo-current');
    });

    let allSelectables = this.getSelectables();
    let idx = _.indexOf(allSelectables, current);
    let target: Dom;
    if (idx > 0) {
      target = $$(allSelectables[idx - 1]);
    } else {
      target = $$(allSelectables[allSelectables.length - 1]);
    }
    this.highlightAndShowCurrentResultWithKeyboard(target);
  }

  private highlightAndShowCurrentResultWithKeyboard(target: Dom) {
    target.addClass('coveo-current');
    this.searchResults.scrollTop = target.el.offsetTop;
  }

  private getSelectables(target = this.searchResults) {
    return $$(target).findAll('.coveo-facet-selectable');
  }

  private performSelectActionOnCurrentSearchResult() {
    let current = $$(this.searchResults).find('.coveo-current');
    Assert.check(current != undefined);

    let checkbox = <HTMLInputElement>$$(current).find('input[type="checkbox"]');
    if (checkbox != undefined) {
      checkbox.checked = true;
      $$(checkbox).trigger('change');
    } else {
      current.click();
    }
  }

  private performExcludeActionOnCurrentSearchResult() {
    let current = $$(this.searchResults).find('.coveo-current');
    Assert.check(current != null);
    let valueCaption = $$(current).find('.coveo-facet-value-caption');
    let valueElement = this.facet.facetValuesList.get($$(valueCaption).text());

    valueElement.toggleExcludeWithUA();
  }

  public getValueInInputForFacetSearch() {
    return this.input.value.trim();
  }
  protected selectAllValuesMatchingSearch() {
    this.facet.showWaitingAnimation();

    let searchParameters = new FacetSearchParameters(this.facet);
    searchParameters.nbResults = 1000;
    searchParameters.setValueToSearch(this.getValueInInputForFacetSearch());
    this.facet.facetQueryController.search(searchParameters).then((fieldValues: IIndexFieldValue[]) => {
      this.completelyDismissSearch();
      ModalBox.close(true);
      let facetValues = _.map(fieldValues, fieldValue => {
        let facetValue = this.facet.values.get(fieldValue.value);
        if (!Utils.exists(facetValue)) {
          facetValue = FacetValue.create(fieldValue);
        }
        facetValue.selected = true;
        facetValue.excluded = false;
        return facetValue;
      });
      this.facet.processFacetSearchAllResultsSelected(facetValues);
    });
    this.completelyDismissSearch();
  }
}
