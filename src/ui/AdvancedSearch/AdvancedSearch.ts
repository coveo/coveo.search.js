import {Component} from '../Base/Component';
import {ComponentOptions} from '../Base/ComponentOptions';
import {IComponentBindings} from '../Base/ComponentBindings';
import {QueryStateModel} from '../../models/QueryStateModel';
import {QueryEvents, IBuildingQueryEventArgs} from '../../events/QueryEvents';
import {SettingsEvents} from '../../events/SettingsEvents';
import {ISettingsPopulateMenuArgs} from '../Settings/Settings';
import {Initialization} from '../Base/Initialization';
import {l} from '../../strings/Strings';
import {$$} from '../../utils/Dom';
import {IAdvancedSearchInput} from './AdvancedSearchInput';
import {KeywordsInput, AllKeywordsInput, ExactKeywordsInput, AnyKeywordsInput, NoneKeywordsInput} from './KeywordsInput';
import {DateInput, AnytimeDateInput, InTheLastDateInput, BetweenDateInput} from './DateInput';
import {SimpleFieldInput, SizeInput, AdvancedFieldInput} from './DocumentInput';
import {ModalBox} from '../../ExternalModulesShim';

export interface IAdvancedSearchOptions {
  includeKeywords?: boolean;
  includeDate?: boolean;
  includeDocument?: boolean;
}

/**
 * TODO documentation
 */
export class AdvancedSearch extends Component {
  static ID = 'AdvancedSearch'

  /**
   * @componentOptions
   */
  static options: IAdvancedSearchOptions = {
    includeKeywords: ComponentOptions.buildBooleanOption({ defaultValue: true }),
    includeDate: ComponentOptions.buildBooleanOption({ defaultValue: true }),
    includeDocument: ComponentOptions.buildBooleanOption({defaultValue: true})
  }

  private modal: Coveo.ModalBox.ModalBox
  private keywords: KeywordsInput[] = [];

  private advancedInputs: IAdvancedSearchInput[] = [];

  constructor(public element: HTMLElement, public options?: IAdvancedSearchOptions, bindings?: IComponentBindings) {
    super(element, AdvancedSearch.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, AdvancedSearch, options);

    this.bind.onRootElement(SettingsEvents.settingsPopulateMenu, (args: ISettingsPopulateMenuArgs) => {
      args.menuData.push({
        text: l('AdvancedSearch_Panel'),
        className: 'coveo-advanced-search',
        onOpen: () => this.open(),
        onClose: () => this.close()
      });
    });

    this.bind.onRootElement(QueryEvents.buildingQuery, (data: IBuildingQueryEventArgs) => {
      _.each(this.advancedInputs, (input) => {
        let value = input.getValue();
        if (value) {
          data.queryBuilder.advancedExpression.add(value);
        }
      })
    })

    this.buildComponent();
  }

  public executeAdvancedSearch() {
    this.updateQueryStateModel();
    this.queryController.executeQuery();
    _.each(this.keywords, (keyword) => {
      keyword.clear();
    })
  }

  private buildComponent() {
    this.buildTitle();
    this.buildCloseButton();
    let component = $$('div');
    if (this.options.includeKeywords) {
      component.append(this.buildKeywordsSection());
    }
    if (this.options.includeDate) {
      component.append(this.buildDateSection());
    }
    if(this.options.includeDocument) {
      component.append(this.buildDocumentSection());
    }

    component.on('keydown', (e: KeyboardEvent) => {
      if (e.keyCode == 13) { // Enter
        this.executeAdvancedSearch();
      }
    })

    this.element.appendChild(component.el);
    $$(this.element).hide();
  }

  private buildTitle(): void {
    var title = $$('div', { className: 'coveo-advanced-search-panel-title' }, l('AdvancedSearch')).el;
    $$(this.element).append(title);
  }

  private buildCloseButton(): void {
    var closeButton = $$('div', { className: 'coveo-advanced-search-panel-close' }, $$('span', { className: 'coveo-icon' }).el)
    closeButton.on('click', () => {
      this.close();
    })
    $$(this.element).append(closeButton.el);
  }

  private open() {
    $$(this.element).show();
  }

  private close() {
    $$(this.element).hide();
  }

  private buildKeywordsSection(): HTMLElement {
    let keywordsInputs = []
    keywordsInputs.push(new AllKeywordsInput());
    keywordsInputs.push(new ExactKeywordsInput());
    keywordsInputs.push(new AnyKeywordsInput());
    keywordsInputs.push(new NoneKeywordsInput());
    return this.buildSection('Keywords', keywordsInputs);
  }

  private buildDateSection(): HTMLElement {
    let dateInputs = [];
    dateInputs.push(new AnytimeDateInput());
    dateInputs.push(new InTheLastDateInput());
    dateInputs.push(new BetweenDateInput());
    return this.buildSection('Date', dateInputs);
  }

  private buildDocumentSection(): HTMLElement {
    let documentInputs = []
    documentInputs.push(new SimpleFieldInput('FileType', '@filetype', this.queryController.getEndpoint()));
    documentInputs.push(new SimpleFieldInput('Language', '@language', this.queryController.getEndpoint()));
    documentInputs.push(new SizeInput());
    documentInputs.push(new AdvancedFieldInput('Title', '@title'));
    documentInputs.push(new AdvancedFieldInput('Author', '@author'));
    return this.buildSection('Document', documentInputs);
  }

  private buildSection(sectionName: string, inputs: IAdvancedSearchInput[]): HTMLElement {
    let section = $$('div', { className: 'coveo-advanced-search-section' });
    let title = $$('div', { className: 'coveo-advanced-search-section-title' });
    title.text(l('AdvancedSearch' + sectionName + 'SectionTitle'));
    section.append(title.el);

    this.advancedInputs = _.union(this.advancedInputs, inputs);

    _.each(inputs, (input)=>{
      section.append(input.build());
    })

    return section.el;
  }

  private updateQueryStateModel() {
    let query = this.queryStateModel.get(QueryStateModel.attributesEnum.q);
    _.each(this.keywords, (keyword) => {
      let inputValue = keyword.getValue();
      if (inputValue) {
        query += query ? '(' + inputValue + ')' : inputValue;
      }
    })
    this.queryStateModel.set(QueryStateModel.attributesEnum.q, query);
  }

}

Initialization.registerAutoCreateComponent(AdvancedSearch);
