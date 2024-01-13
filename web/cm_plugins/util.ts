// Forked from https://codeberg.org/retronav/ixora
// Original author: Pranav Karawale
// License: Apache License 2.0.
import {
  Decoration,
  DecorationSet,
  EditorState,
  EditorView,
  StateField,
  Transaction,
  WidgetType,
} from "../deps.ts";

type LinkOptions = {
  text: string;
  href?: string;
  title: string;
  cssClass: string;
  callback: (e: MouseEvent) => void;
};
export class LinkWidget extends WidgetType {
  constructor(
    readonly options: LinkOptions,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    const anchor = document.createElement("a");
    anchor.className = this.options.cssClass;
    anchor.textContent = this.options.text;

    // Mouse handling
    anchor.addEventListener("mousedown", (e) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.options.callback(e);
    });

    // Touch handling
    let touchCount = 0;
    anchor.addEventListener("touchmove", () => {
      touchCount++;
    });
    anchor.addEventListener("touchend", (e) => {
      if (touchCount === 0) {
        e.preventDefault();
        e.stopPropagation();
        this.options.callback(new MouseEvent("click", e));
      }
      touchCount = 0;
    });
    anchor.setAttribute("title", this.options.title);
    anchor.href = this.options.href || "#";
    return anchor;
  }
}

export class HtmlWidget extends WidgetType {
  constructor(
    readonly html: string,
    readonly className?: string,
    readonly onClick?: (e: MouseEvent) => void,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    const el = document.createElement("span");
    if (this.className) {
      el.className = this.className;
    }
    if (this.onClick) {
      el.addEventListener("click", this.onClick);
    }
    el.innerHTML = this.html;
    return el;
  }
}

export function decoratorStateField(
  stateToDecoratorMapper: (state: EditorState) => DecorationSet,
) {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      return stateToDecoratorMapper(state);
    },

    update(value: DecorationSet, tr: Transaction) {
      // if (tr.docChanged || tr.selection) {
      return stateToDecoratorMapper(tr.state);
      // }
      // return value;
    },

    provide: (f) => EditorView.decorations.from(f),
  });
}

export class ButtonWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly title: string,
    readonly cssClass: string,
    readonly callback: (e: MouseEvent) => void,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    const anchor = document.createElement("button");
    anchor.className = this.cssClass;
    anchor.textContent = this.text;
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.callback(e);
    });
    anchor.setAttribute("title", this.title);
    return anchor;
  }
}

/**
 * Check if two ranges overlap
 * Based on the visual diagram on https://stackoverflow.com/a/25369187
 * @param range1 - Range 1
 * @param range2 - Range 2
 * @returns True if the ranges overlap
 */
export function checkRangeOverlap(
  range1: [number, number],
  range2: [number, number],
) {
  return range1[0] <= range2[1] && range2[0] <= range1[1];
}

/**
 * Check if a range is inside another range
 * @param parent - Parent (bigger) range
 * @param child - Child (smaller) range
 * @returns True if child is inside parent
 */
export function checkRangeSubset(
  parent: [number, number],
  child: [number, number],
) {
  return child[0] >= parent[0] && child[1] <= parent[1];
}

/**
 * Check if any of the editor cursors is in the given range
 * @param state - Editor state
 * @param range - Range to check
 * @returns True if the cursor is in the range
 */
export function isCursorInRange(state: EditorState, range: [number, number]) {
  return state.selection.ranges.some((selection) =>
    checkRangeOverlap(range, [selection.from, selection.to])
  );
}

export function shouldRenderAsCode(
  state: EditorState,
  range: [number, number],
) {
  const mainSelection = state.selection.main;
  // When the selection is empty, we need to check if the cursor is inside the fenced code
  if (mainSelection.empty) {
    return checkRangeOverlap(range, [mainSelection.from, mainSelection.to]);
  } else {
    // If the selection is encompassing the fenced code we render as code, or vice versa
    return checkRangeSubset([mainSelection.from, mainSelection.to], range) ||
      checkRangeSubset(range, [mainSelection.from, mainSelection.to]);
  }
}

/**
 * Decoration to simply hide anything.
 */
export const invisibleDecoration = Decoration.replace({});
