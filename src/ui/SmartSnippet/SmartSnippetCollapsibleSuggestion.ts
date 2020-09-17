import { IPartialQuestionAnswerResponse } from '../../rest/QuestionAnswerResponse';
import { uniqueId } from 'underscore';
import { AccessibleButton } from '../../utils/AccessibleButton';
import { SVGIcons } from '../../utils/SVGIcons';
import { attachShadow } from '../../misc/AttachShadowPolyfill';
import { $$, Dom } from '../../utils/Dom';
import { l } from '../../strings/Strings';
import { IQueryResult } from '../../rest/QueryResult';

const QUESTION_CLASSNAME = `coveo-smart-snippet-suggestions-question`;
const QUESTION_TITLE_CLASSNAME = `${QUESTION_CLASSNAME}-title`;
const QUESTION_TITLE_LABEL_CLASSNAME = `${QUESTION_TITLE_CLASSNAME}-label`;
const QUESTION_TITLE_CHECKBOX_CLASSNAME = `${QUESTION_TITLE_CLASSNAME}-checkbox`;
const QUESTION_SNIPPET_CLASSNAME = `${QUESTION_CLASSNAME}-snippet`;
const QUESTION_SNIPPET_HIDDEN_CLASSNAME = `${QUESTION_SNIPPET_CLASSNAME}-hidden`;
const SHADOW_CLASSNAME = `${QUESTION_SNIPPET_CLASSNAME}-content`;
const SOURCE_CLASSNAME = `${QUESTION_CLASSNAME}-source`;
const SOURCE_TITLE_CLASSNAME = `${SOURCE_CLASSNAME}-title`;
const SOURCE_URL_CLASSNAME = `${SOURCE_CLASSNAME}-url`;

export class SmartSnippetCollapsibleSuggestion {
  private readonly labelId = uniqueId(QUESTION_TITLE_LABEL_CLASSNAME);
  private readonly snippetId = uniqueId(QUESTION_SNIPPET_CLASSNAME);
  private readonly checkboxId = uniqueId(QUESTION_TITLE_CHECKBOX_CLASSNAME);
  private contentLoaded: Promise<void>;
  private collapsibleContainer: Dom;
  private checkbox: Dom;
  private expanded = false;

  constructor(
    private readonly questionAnswer: IPartialQuestionAnswerResponse,
    private readonly innerCSS?: string,
    private readonly source?: IQueryResult
  ) {}

  public get loading() {
    return this.contentLoaded;
  }

  public build() {
    const collapsibleContainer = this.buildCollapsibleContainer(
      this.questionAnswer.answerSnippet,
      this.questionAnswer.question,
      this.innerCSS && this.buildStyle(this.innerCSS)
    );
    const title = this.buildTitle(this.questionAnswer.question);
    this.updateExpanded();
    return $$(
      'li',
      {
        className: QUESTION_CLASSNAME,
        ariaLabelledby: this.labelId
      },
      title,
      collapsibleContainer
    ).el as HTMLLIElement;
  }

  private buildStyle(innerCSS: string) {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = innerCSS;
    return styleTag;
  }

  private buildTitle(question: string) {
    const checkbox = this.buildCheckbox(question);
    const label = $$('span', { className: QUESTION_TITLE_LABEL_CLASSNAME, id: this.labelId });
    label.text(question);
    const title = $$('span', { className: QUESTION_TITLE_CLASSNAME }, label, checkbox);
    title.on('click', () => this.toggle());
    return title;
  }

  private buildCheckbox(question: string) {
    this.checkbox = $$('div', {
      role: 'button',
      tabindex: 0,
      ariaControls: this.snippetId,
      className: QUESTION_TITLE_CHECKBOX_CLASSNAME,
      id: this.checkboxId
    });
    new AccessibleButton()
      .withElement(this.checkbox)
      .withLabel(l('ExpandQuestionAnswer', question))
      .withEnterKeyboardAction(() => this.toggle())
      .build();
    return this.checkbox;
  }

  private buildCollapsibleContainer(innerHTML: string, title: string, style?: HTMLStyleElement) {
    const shadowContainer = $$('div', { className: SHADOW_CLASSNAME });
    this.collapsibleContainer = $$('div', { className: QUESTION_SNIPPET_CLASSNAME, id: this.snippetId }, shadowContainer);
    this.contentLoaded = attachShadow(shadowContainer.el, { mode: 'open', title: l('AnswerSpecificSnippet', title) }).then(shadowRoot => {
      shadowRoot.appendChild(this.buildAnswerSnippetContent(innerHTML, style).el);
    });
    if (this.source) {
      this.collapsibleContainer.append(this.buildSourceUrl(this.source.clickUri));
      this.collapsibleContainer.append(this.buildSourceTitle(this.source.title, this.source.clickUri));
    }
    return this.collapsibleContainer;
  }

  private buildAnswerSnippetContent(innerHTML: string, style?: HTMLStyleElement) {
    const snippet = $$('div', {}, innerHTML);
    const container = $$('div', {}, snippet);
    if (style) {
      container.append(style);
    }
    return container;
  }

  private buildSourceTitle(title: string, clickUri: string) {
    return this.buildLink(title, clickUri, SOURCE_TITLE_CLASSNAME);
  }

  private buildSourceUrl(url: string) {
    return this.buildLink(url, url, SOURCE_URL_CLASSNAME);
  }

  private buildLink(text: string, href: string, className: string) {
    const element = $$('a', { className, href }).el as HTMLAnchorElement;
    element.innerText = text;
    return element;
  }

  private toggle() {
    this.expanded = !this.expanded;
    this.updateExpanded();
  }

  private updateExpanded() {
    this.checkbox.setAttribute('aria-expanded', this.expanded.toString());
    this.checkbox.setHtml(this.expanded ? SVGIcons.icons.arrowUp : SVGIcons.icons.arrowDown);
    this.collapsibleContainer.setAttribute('tabindex', `${this.expanded ? 0 : -1}`);
    this.collapsibleContainer.setAttribute('aria-hidden', (!this.expanded).toString());
    this.collapsibleContainer.toggleClass(QUESTION_SNIPPET_HIDDEN_CLASSNAME, !this.expanded);
  }
}
