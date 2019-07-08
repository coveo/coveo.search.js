import { Combobox } from './Combobox';
import { $$ } from '../../utils/Dom';
import { find } from 'underscore';

export interface IComboboxValue {
  value: any;
  element: HTMLElement;
}

export class ComboboxValues {
  public element: HTMLElement;
  public mouseIsOverValue = false;
  private values: IComboboxValue[] = [];
  private keyboardActiveValue?: IComboboxValue;

  constructor(private combobox: Combobox) {
    this.element = $$('ul', {
      id: `${this.combobox.id}-listbox`,
      role: 'listbox',
      className: 'coveo-combobox-values',
      ariaLabelledby: `${this.combobox.id}-label`
    }).el;
    $$(this.element).hide();
  }

  public renderFromResponse(response: any) {
    this.clearValues();
    this.values = this.combobox.options.createValuesFromResponse(response);
    this.render();
    this.updateAccessibilityAttributes();
  }

  private render() {
    $$(this.element).show();

    if (!this.hasValues()) {
      return this.renderNoValuesFound();
    }

    this.renderValues();
    this.addEventListeners();
  }

  private renderValues() {
    const fragment = document.createDocumentFragment();
    this.values.forEach((value, index) => {
      const elementWrapper = $$('li', { id: `${this.combobox.id}value-${index}`, className: 'coveo-combobox-value' }, value.element).el;
      value.element = elementWrapper;
      fragment.appendChild(value.element);
    });

    this.element.appendChild(fragment);
  }

  private hasValues() {
    return !!this.values.length;
  }

  private renderNoValuesFound() {
    const label = this.combobox.options.noValuesFoundLabel;
    const noValuesFoundElement = $$(
      'li',
      {
        className: 'coveo-combobox-value-not-found'
      },
      label
    ).el;

    this.element.appendChild(noValuesFoundElement);
    this.combobox.updateAriaLive(label);
  }

  private addEventListeners() {
    this.values.forEach(({ element }) => {
      $$(element).on('mouseenter', () => (this.mouseIsOverValue = true));
      $$(element).on('mouseleave', () => (this.mouseIsOverValue = false));
      $$(element).on('click', this.onValueClick.bind(this));
    });
  }

  private onValueClick(e: MouseEvent) {
    if (!this.combobox.options.selectValueOnClick) {
      return;
    }

    const target = <HTMLElement>e.target;
    const targetElement = !$$(target).hasClass('coveo-combobox-value') ? $$(target).parent('coveo-combobox-value') : target;

    if (!targetElement) {
      return;
    }

    const value = find(this.values, ({ element }) => element.getAttribute('id') === targetElement.getAttribute('id'));
    value && this.combobox.options.onSelectValue(value);
    this.combobox.clearAll();
  }

  private updateAccessibilityAttributes() {
    const activeDescendant = this.keyboardActiveValue ? this.keyboardActiveValue.element.getAttribute('id') : '';

    this.combobox.updateAccessibilityAttributes({
      activeDescendant,
      expanded: this.hasValues()
    });
  }

  public clearValues() {
    this.mouseIsOverValue = false;
    this.resetKeyboardActiveValue();
    $$(this.element).empty();
    $$(this.element).hide();
    this.values = [];
    this.updateAccessibilityAttributes();
  }

  private setKeyboardActiveValue(value: IComboboxValue) {
    this.keyboardActiveValue = value;
    this.activateFocusOnValue(this.keyboardActiveValue);
  }

  private resetKeyboardActiveValue() {
    if (!this.keyboardActiveValue) {
      return;
    }

    this.deactivateFocusOnValue(this.keyboardActiveValue);
    this.keyboardActiveValue = null;
  }

  private activateFocusOnValue({ element }: IComboboxValue) {
    $$(element).addClass('coveo-focused');
    element.setAttribute('aria-selected', 'true');
  }

  private deactivateFocusOnValue({ element }: IComboboxValue) {
    $$(element).removeClass('coveo-focused');
    element.setAttribute('aria-selected', 'false');
  }

  public selectActiveValue() {
    if (!this.keyboardActiveValue) {
      return;
    }

    this.combobox.options.onSelectValue(this.keyboardActiveValue);
    this.combobox.clearAll();
  }

  public moveActiveValueDown() {
    if (!this.hasValues()) {
      return;
    }

    const nextActiveValue = this.nextOrFirstValue;
    this.resetKeyboardActiveValue();
    this.setKeyboardActiveValue(nextActiveValue);
    this.updateAccessibilityAttributes();
  }

  public moveActiveValueUp() {
    if (!this.hasValues()) {
      return;
    }

    const previousActiveValue = this.previousOrLastValue;
    this.resetKeyboardActiveValue();
    this.setKeyboardActiveValue(previousActiveValue);
    this.updateAccessibilityAttributes();
  }

  private get nextOrFirstValue() {
    if (!this.keyboardActiveValue) {
      return this.values[0];
    }

    const nextValueIndex = this.values.indexOf(this.keyboardActiveValue) + 1;
    return nextValueIndex < this.values.length ? this.values[nextValueIndex] : this.values[0];
  }

  private get previousOrLastValue() {
    const lastValueIndex = this.values.length - 1;
    if (!this.keyboardActiveValue) {
      return this.values[lastValueIndex];
    }

    const previousValueIndex = this.values.indexOf(this.keyboardActiveValue) - 1;
    return previousValueIndex >= 0 ? this.values[previousValueIndex] : this.values[lastValueIndex];
  }
}
